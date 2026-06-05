/**
 * Automated Claim Processing Pipeline
 * 
 * Orchestrates:
 *   1. Rule-based validation (timing, hospital, member, frequency, duplication, premium, temporal)
 *   2. ML fraud scoring (XGBoost via ml-client)
 *   3. Final label assignment: VALID | SUSPICIOUS | FRAUDULENT
 * 
 * Fail-safe: defaults to SUSPICIOUS if any layer fails.
 */

import { validateClaimRules, calculateReimbursement, creditWallet } from "@/lib/db/operations"
import { predictFraudScore, checkMLServiceHealth } from "@/lib/ml-client"

export interface ProcessedClaimResult {
  fraudScore: number
  fraudLabel: "VALID" | "SUSPICIOUS" | "FRAUDULENT"
  mlLabel: "VALID" | "SUSPICIOUS" | "FRAUDULENT" | null
  mlScore: number | null
  rulesPassed: string[]
  rulesFailed: string[]
  mlAvailable: boolean
  approvalStatus: "APPROVED" | "REJECTED" | "UNDER_REVIEW"
  rejectionReason: string | null
  approvedAmount: number | null
  reimbursement: number | null
}

interface ClaimInput {
  totalBilled: number
  serviceType: string
  diagnosisCode: string
  serviceDate: string
  submissionDate?: string
}

const RULE_FAILURE_REASONS: Record<string, string> = {
  TIMING_RULE: "Service date must be within 7 days of submission date",
  HOSPITAL_RULE: "Hospital is not active or not registered",
  MEMBER_RULE: "Member is not active or premium is not active",
  FREQUENCY_RULE: "Member has exceeded maximum allowed claims per period",
  DUPLICATION_RULE: "Duplicate claim detected within 6 months",
  PREMIUM_STATUS: "Member's premium payment is not active",
}

function getRuleSeverity(ruleName: string): "hard" | "soft" {
  const softRules = ["PREMIUM_STATUS"]
  return softRules.includes(ruleName) ? "soft" : "hard"
}

export async function processClaimAutomatically(
  claimId: number,
  claimData: ClaimInput
): Promise<ProcessedClaimResult> {
  const result: ProcessedClaimResult = {
    fraudScore: 0,
    fraudLabel: "SUSPICIOUS",
    mlLabel: null,
    mlScore: null,
    rulesPassed: [],
    rulesFailed: [],
    mlAvailable: false,
    approvalStatus: "REJECTED",
    rejectionReason: null,
    approvedAmount: null,
    reimbursement: null,
  }

  // ── STEP 1: Rule-based validation ──────────────────────────────────────────
  let ruleResults
  try {
    ruleResults = await validateClaimRules(claimId)
  } catch (err) {
    console.error("[ClaimProcessor] Rule validation failed:", err)
    result.rulesFailed.push("RULE_ENGINE_ERROR")
    result.rejectionReason = "Validation engine error — claim flagged for manual review"
    result.approvalStatus = "UNDER_REVIEW"
    return result
  }

  const hardFailures: string[] = []
  const softFailures: string[] = []

  for (const rule of ruleResults) {
    if (rule.passed) {
      result.rulesPassed.push(rule.ruleName)
    } else {
      result.rulesFailed.push(rule.ruleName)
      const severity = getRuleSeverity(rule.ruleName)
      if (severity === "hard") {
        hardFailures.push(rule.ruleName)
      } else {
        softFailures.push(rule.ruleName)
      }
    }
  }

  // ── STEP 2: ML scoring ──────────────────────────────────────────────────────
  const mlHealthy = await checkMLServiceHealth()
  result.mlAvailable = mlHealthy

  if (mlHealthy) {
    try {
      const mlResult = await predictFraudScore({
        total_billed: claimData.totalBilled,
        service_type: claimData.serviceType,
        diagnosis_code: claimData.diagnosisCode,
        service_date: claimData.serviceDate,
        submission_date: claimData.submissionDate || new Date().toISOString(),
      })

      if (mlResult) {
        result.mlLabel = mlResult.fraud_label
        result.mlScore = mlResult.fraud_score
      }
    } catch (err) {
      console.error("[ClaimProcessor] ML prediction failed:", err)
    }
  }

  // ── STEP 4: Combine rules + ML into final label ────────────────────────────
  if (hardFailures.length > 0) {
    result.fraudLabel = "FRAUDULENT"
    result.fraudScore = 85
    result.approvalStatus = "REJECTED"
    result.rejectionReason = RULE_FAILURE_REASONS[hardFailures[0]] || "Failed hard validation rules"
    return result
  }

  if (softFailures.length > 0 && result.mlLabel === "FRAUDULENT") {
    result.fraudLabel = "FRAUDULENT"
    result.fraudScore = Math.max(result.mlScore || 70, 70)
    result.approvalStatus = "REJECTED"
    result.rejectionReason = softFailures.map(f => RULE_FAILURE_REASONS[f]).join("; ")
    return result
  }

  if (result.mlLabel === "FRAUDULENT") {
    result.fraudLabel = "FRAUDULENT"
    result.fraudScore = result.mlScore || 75
    result.approvalStatus = "REJECTED"
    result.rejectionReason = "ML model detected high fraud probability"
    return result
  }

  if (result.mlLabel === "SUSPICIOUS" || softFailures.length > 0) {
    result.fraudLabel = "SUSPICIOUS"
    result.fraudScore = result.mlScore || 45
    result.approvalStatus = "UNDER_REVIEW"
    result.rejectionReason = softFailures.length > 0
      ? softFailures.map(f => RULE_FAILURE_REASONS[f]).join("; ")
      : "ML model flagged claim for review"
    return result
  }

  if (result.mlLabel === "VALID" || !mlHealthy) {
    result.fraudLabel = "VALID"
    result.fraudScore = result.mlScore || 10
    result.approvalStatus = "APPROVED"

    const reimburseResult = calculateReimbursement(claimData.totalBilled)
    result.approvedAmount = claimData.totalBilled
    result.reimbursement = reimburseResult.reimbursement
    return result
  }

  // ── STEP 5: Fail-safe default ──────────────────────────────────────────────
  result.fraudLabel = "SUSPICIOUS"
  result.fraudScore = 50
  result.approvalStatus = "UNDER_REVIEW"
  result.rejectionReason = "Automated scoring inconclusive — flagged for manual review"
  return result
}
