// Rule-based fraud detection engine aligned with ClaimsGuard backend
// Mirrors MemberDomain.isHighRisk() and ML scoring logic

import { createClient } from "@/lib/supabase/server"

export interface FraudFlag {
  flagType: string
  flagReason: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

export interface FraudAssessment {
  fraudScore: number // 0-100
  fraudLabel: "VALID" | "SUSPICIOUS" | "FRAUDULENT"
  flags: FraudFlag[]
  reasons: string[]
}

export interface RiskAssessment {
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  reasons: string[]
  totalClaims: number
  recentClaims: number
  fraudClaims: number
  totalClaimed: number
  totalApproved: number
}

// Thresholds aligned with backend
const THRESHOLDS = {
  HIGH_CLAIM_FREQUENCY: 5, // >5 claims in 30 days
  ELDERLY_AGE: 65,
  HIGH_FRAUD_SCORE: 70,
  SUSPICIOUS_FRAUD_SCORE: 40,
  MAX_DAILY_CLAIMS: 3,
  DUPLICATE_WINDOW_DAYS: 7,
  HIGH_AMOUNT_MULTIPLIER: 3, // 3x average is suspicious
}

// Service type average costs in KSH (for anomaly detection)
const AVERAGE_COSTS: Record<string, number> = {
  OUTPATIENT: 5000,
  INPATIENT: 50000,
  DAYCARE: 15000,
  DENTAL: 8000,
  OPTICAL: 6000,
  MATERNITY: 80000,
  SURGICAL: 100000,
  EMERGENCY: 25000,
  CHRONIC: 10000,
  PREVENTIVE: 3000,
}

/**
 * Analyze a claim for fraud indicators
 * Mirrors the backend validation.service.ts and MemberDomain.isHighRisk()
 */
export async function analyzeClaim(
  memberId: string,
  claimData: {
    serviceDate: string
    serviceType: string
    totalBilled: number
    diagnosisCode?: string
    diagnosisDesc?: string
    facilityCode?: string
  }
): Promise<FraudAssessment> {
  const supabase = await createClient()
  const flags: FraudFlag[] = []
  const reasons: string[] = []
  let fraudScore = 0

  // 1. Get member info and claim history
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single()

  if (!member) {
    return {
      fraudScore: 100,
      fraudLabel: "FRAUDULENT",
      flags: [{ flagType: "INVALID_MEMBER", flagReason: "Member not found", severity: "CRITICAL" }],
      reasons: ["Member does not exist in the system"],
    }
  }

  // 2. Get recent claims for this member (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentClaims } = await supabase
    .from("claims")
    .select("*")
    .eq("member_id", memberId)
    .gte("submission_date", thirtyDaysAgo.toISOString())

  const claimCount = recentClaims?.length || 0

  // 3. Get all claims for fraud history check
  const { data: allClaims } = await supabase
    .from("claims")
    .select("*")
    .eq("member_id", memberId)

  // === RULE-BASED CHECKS ===

  // Rule 1: Check insurance status
  if (member.cover_status !== "ACTIVE") {
    fraudScore += 30
    flags.push({
      flagType: "INACTIVE_COVER",
      flagReason: `Member cover status is ${member.cover_status}`,
      severity: "HIGH",
    })
    reasons.push(`Member insurance cover is ${member.cover_status.toLowerCase()}`)
  }

  // Rule 2: Check cover expiry
  if (member.cover_expiry && new Date(member.cover_expiry) < new Date()) {
    fraudScore += 25
    flags.push({
      flagType: "EXPIRED_COVER",
      flagReason: "Insurance cover has expired",
      severity: "HIGH",
    })
    reasons.push("Member insurance cover has expired")
  }

  // Rule 3: High claim frequency (>5 claims in 30 days)
  if (claimCount > THRESHOLDS.HIGH_CLAIM_FREQUENCY) {
    fraudScore += 20
    flags.push({
      flagType: "HIGH_FREQUENCY",
      flagReason: `${claimCount} claims in the last 30 days exceeds threshold of ${THRESHOLDS.HIGH_CLAIM_FREQUENCY}`,
      severity: "MEDIUM",
    })
    reasons.push(`Unusually high claim frequency: ${claimCount} claims in 30 days`)
  }

  // Rule 4: Multiple claims on same day
  const serviceDate = new Date(claimData.serviceDate).toDateString()
  const sameDayClaims = recentClaims?.filter(
    (c) => new Date(c.service_date).toDateString() === serviceDate
  )
  if (sameDayClaims && sameDayClaims.length >= THRESHOLDS.MAX_DAILY_CLAIMS) {
    fraudScore += 15
    flags.push({
      flagType: "MULTIPLE_DAILY_CLAIMS",
      flagReason: `${sameDayClaims.length + 1} claims on the same service date`,
      severity: "MEDIUM",
    })
    reasons.push(`Multiple claims submitted for the same day`)
  }

  // Rule 5: Duplicate claim detection (same diagnosis, same provider, within 7 days)
  const duplicateWindowDate = new Date(claimData.serviceDate)
  duplicateWindowDate.setDate(duplicateWindowDate.getDate() - THRESHOLDS.DUPLICATE_WINDOW_DAYS)

  const potentialDuplicates = recentClaims?.filter((c) => {
    const claimDate = new Date(c.service_date)
    return (
      claimDate >= duplicateWindowDate &&
      c.diagnosis_code === claimData.diagnosisCode &&
      c.service_type === claimData.serviceType
    )
  })

  if (potentialDuplicates && potentialDuplicates.length > 0) {
    fraudScore += 25
    flags.push({
      flagType: "POTENTIAL_DUPLICATE",
      flagReason: `Similar claim found within ${THRESHOLDS.DUPLICATE_WINDOW_DAYS} days`,
      severity: "HIGH",
    })
    reasons.push("Potential duplicate claim detected")
  }

  // Rule 6: Unusually high amount for service type
  const avgCost = AVERAGE_COSTS[claimData.serviceType] || 10000
  if (claimData.totalBilled > avgCost * THRESHOLDS.HIGH_AMOUNT_MULTIPLIER) {
    fraudScore += 15
    flags.push({
      flagType: "HIGH_AMOUNT",
      flagReason: `Billed amount KSh ${claimData.totalBilled.toLocaleString()} is ${(claimData.totalBilled / avgCost).toFixed(1)}x the average for ${claimData.serviceType}`,
      severity: "MEDIUM",
    })
    reasons.push(`Claim amount significantly exceeds average for service type`)
  }

  // Rule 7: Prior fraud history
  const fraudulentClaims = allClaims?.filter((c) => c.fraud_label === "FRAUDULENT")
  if (fraudulentClaims && fraudulentClaims.length > 0) {
    fraudScore += 30
    flags.push({
      flagType: "PRIOR_FRAUD",
      flagReason: `Member has ${fraudulentClaims.length} prior fraudulent claim(s)`,
      severity: "CRITICAL",
    })
    reasons.push(`Member has history of ${fraudulentClaims.length} fraudulent claims`)
  }

  // Rule 8: Elderly patient flag (informational, not penalized heavily)
  const memberAge = calculateAge(new Date(member.date_of_birth))
  if (memberAge >= THRESHOLDS.ELDERLY_AGE) {
    // Elderly patients may have legitimate high utilization
    // Only flag for review, don't heavily penalize
    flags.push({
      flagType: "ELDERLY_PATIENT",
      flagReason: `Patient is ${memberAge} years old`,
      severity: "LOW",
    })
  }

  // Rule 9: Weekend/holiday claim (informational)
  const dayOfWeek = new Date(claimData.serviceDate).getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    flags.push({
      flagType: "WEEKEND_SERVICE",
      flagReason: "Service provided on weekend",
      severity: "LOW",
    })
  }

  // Cap fraud score at 100
  fraudScore = Math.min(fraudScore, 100)

  // Determine fraud label
  let fraudLabel: "VALID" | "SUSPICIOUS" | "FRAUDULENT"
  if (fraudScore >= THRESHOLDS.HIGH_FRAUD_SCORE) {
    fraudLabel = "FRAUDULENT"
  } else if (fraudScore >= THRESHOLDS.SUSPICIOUS_FRAUD_SCORE) {
    fraudLabel = "SUSPICIOUS"
  } else {
    fraudLabel = "VALID"
  }

  return {
    fraudScore,
    fraudLabel,
    flags,
    reasons,
  }
}

/**
 * Get member risk assessment
 * Mirrors MemberDomain.getRiskAssessment()
 */
export async function getMemberRiskAssessment(memberId: string): Promise<RiskAssessment> {
  const supabase = await createClient()

  // Get member
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single()

  if (!member) {
    return {
      riskLevel: "HIGH",
      reasons: ["Member not found"],
      totalClaims: 0,
      recentClaims: 0,
      fraudClaims: 0,
      totalClaimed: 0,
      totalApproved: 0,
    }
  }

  // Get all claims
  const { data: allClaims } = await supabase
    .from("claims")
    .select("*")
    .eq("member_id", memberId)

  // Get recent claims (30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentClaims } = await supabase
    .from("claims")
    .select("*")
    .eq("member_id", memberId)
    .gte("submission_date", thirtyDaysAgo.toISOString())

  const totalClaims = allClaims?.length || 0
  const recentClaimCount = recentClaims?.length || 0
  const fraudClaims = allClaims?.filter((c) => c.fraud_label === "FRAUDULENT").length || 0
  const totalClaimed = allClaims?.reduce((sum, c) => sum + Number(c.total_billed), 0) || 0
  const totalApproved = allClaims?.reduce((sum, c) => sum + Number(c.approved_amount || 0), 0) || 0

  const reasons: string[] = []

  // Check risk factors
  if (fraudClaims > 0) {
    reasons.push(`${fraudClaims} prior fraudulent claim(s)`)
  }
  if (recentClaimCount > THRESHOLDS.HIGH_CLAIM_FREQUENCY) {
    reasons.push(`High claim frequency: ${recentClaimCount} claims in 30 days`)
  }
  if (member.cover_status !== "ACTIVE") {
    reasons.push(`Cover status: ${member.cover_status}`)
  }
  if (member.cover_expiry && new Date(member.cover_expiry) < new Date()) {
    reasons.push("Cover has expired")
  }

  // Determine risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH"
  if (fraudClaims > 0 || member.cover_status !== "ACTIVE") {
    riskLevel = "HIGH"
  } else if (recentClaimCount > THRESHOLDS.HIGH_CLAIM_FREQUENCY) {
    riskLevel = "MEDIUM"
  } else {
    riskLevel = "LOW"
  }

  return {
    riskLevel,
    reasons,
    totalClaims,
    recentClaims: recentClaimCount,
    fraudClaims,
    totalClaimed,
    totalApproved,
  }
}

// Helper function
function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
