import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

interface ClaimData {
  total_billed: number
  service_type: string
  diagnosis_code?: string
  service_date?: string
  quantity?: number
  procedure_code?: string
}

interface HistoricalData {
  beneficiary_claim_count: number
  beneficiary_avg_claim_amount: number
  provider_claim_count: number
  provider_avg_claim_amount: number
}

interface FraudAssessment {
  fraudScore: number
  fraudProbability: number
  fraudLabel: "VALID" | "SUSPICIOUS" | "FRAUDULENT"
  flags: Array<{
    flagType: string
    severity: string
  }>
}

/**
 * Call XGBoost ML model via Python subprocess
 * Falls back to rule-based scoring if ML unavailable
 */
export async function predictFraudScore(
  claimData: ClaimData,
  historicalData: HistoricalData
): Promise<FraudAssessment> {
  try {
    // Check if Python ML service is available
    const mlDir = path.join(process.cwd(), 'ml')
    const modelPath = path.join(mlDir, 'models', 'fraud_model.pkl')

    // If model doesn't exist, use rule-based fallback
    if (!require('fs').existsSync(modelPath)) {
      console.log('[ML] Model not found, using rule-based scoring')
      return ruleBasedScore(claimData, historicalData)
    }

    // Try to call ML model
    return await callMLModel(claimData, historicalData)
  } catch (error) {
    console.error('[ML] Error calling model, falling back to rules:', error)
    return ruleBasedScore(claimData, historicalData)
  }
}

async function callMLModel(
  claimData: ClaimData,
  historicalData: HistoricalData
): Promise<FraudAssessment> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      path.join(process.cwd(), 'ml', 'scorer.py'),
    ])

    let output = ''
    let errorOutput = ''

    python.stdout.on('data', (data) => {
      output += data.toString()
    })

    python.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('[ML] Python error:', errorOutput)
        reject(new Error(`Python process exited with code ${code}`))
        return
      }

      try {
        const result = JSON.parse(output)
        resolve({
          fraudScore: result.fraud_score,
          fraudProbability: result.fraud_probability,
          fraudLabel: result.fraud_label,
          flags: result.flags.map((f: any) => ({
            flagType: f.type || f.flagType,
            severity: f.severity,
          })),
        })
      } catch (e) {
        console.error('[ML] Failed to parse output:', output)
        reject(e)
      }
    })

    const inputData = JSON.stringify({
      claim_data: claimData,
      historical_data: historicalData,
    })

    python.stdin.write(inputData)
    python.stdin.end()
  })
}

/**
 * Rule-based fallback fraud scoring
 */
function ruleBasedScore(
  claimData: ClaimData,
  historicalData: HistoricalData
): FraudAssessment {
  let fraudScore = 0
  const flags = []

  // Rule 1: High claim amount
  const avgBeneficiaryAmount = historicalData.beneficiary_avg_claim_amount
  if (claimData.total_billed > avgBeneficiaryAmount * 3) {
    fraudScore += 25
    flags.push({
      flagType: 'HIGH_AMOUNT',
      severity: 'MEDIUM',
    })
  }

  // Rule 2: High frequency
  if (historicalData.beneficiary_claim_count > 5) {
    fraudScore += 15
    flags.push({
      flagType: 'FREQUENCY_ANOMALY',
      severity: 'LOW',
    })
  }

  // Rule 3: Provider pattern
  const avgProviderAmount = historicalData.provider_avg_claim_amount
  if (claimData.total_billed > avgProviderAmount * 2.5) {
    fraudScore += 20
    flags.push({
      flagType: 'PROVIDER_PATTERN',
      severity: 'MEDIUM',
    })
  }

  // Rule 4: Round amounts (suspicious)
  if (claimData.total_billed % 1000 === 0 && claimData.total_billed > 10000) {
    fraudScore += 15
    flags.push({
      flagType: 'ROUND_AMOUNT',
      severity: 'LOW',
    })
  }

  // Rule 5: Inpatient high cost
  if (claimData.service_type === 'INPATIENT' && claimData.total_billed > 100000) {
    fraudScore += 10
  }

  // Rule 6: High procedure quantity
  if ((claimData.quantity || 1) > 10) {
    fraudScore += 15
    flags.push({
      flagType: 'HIGH_QUANTITY',
      severity: 'LOW',
    })
  }

  // Normalize score to 0-100
  fraudScore = Math.min(100, fraudScore)

  // Determine label
  let fraudLabel: "VALID" | "SUSPICIOUS" | "FRAUDULENT"
  if (fraudScore > 70) {
    fraudLabel = 'FRAUDULENT'
  } else if (fraudScore > 40) {
    fraudLabel = 'SUSPICIOUS'
  } else {
    fraudLabel = 'VALID'
  }

  return {
    fraudScore: Math.round(fraudScore),
    fraudProbability: fraudScore / 100,
    fraudLabel,
    flags,
  }
}
