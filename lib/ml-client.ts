/**
 * ML Client for fraud detection service.
 * Communicates with the Python ML service for XGBoost predictions.
 */

interface ClaimData {
  total_billed: number
  service_type: string
  diagnosis_code: string
  service_date: string
  submission_date?: string
  facility_type?: string
  county?: string
  gender?: string
  date_of_birth?: string
  insurer_type?: string
}

interface FraudFlag {
  flag_type: string
  flag_reason: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface PredictionResult {
  fraud_score: number
  fraud_label: 'VALID' | 'SUSPICIOUS' | 'FRAUDULENT'
  confidence: number
  flags: FraudFlag[]
}

interface BatchPredictionResult {
  predictions: PredictionResult[]
}

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001'
const ML_SERVICE_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT || '30000')

/**
 * Check if ML service is available
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get fraud prediction for a single claim from ML service
 */
export async function getMLPrediction(claimData: ClaimData): Promise<PredictionResult | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_TIMEOUT)
    
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(claimData),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error('[ML Client] Prediction failed:', await response.text())
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('[ML Client] Error calling ML service:', error)
    return null
  }
}

/**
 * Get fraud predictions for multiple claims from ML service
 */
export async function getBatchMLPredictions(claims: ClaimData[]): Promise<PredictionResult[] | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_TIMEOUT * 2)
    
    const response = await fetch(`${ML_SERVICE_URL}/predict/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claims }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error('[ML Client] Batch prediction failed:', await response.text())
      return null
    }
    
    const result: BatchPredictionResult = await response.json()
    return result.predictions
  } catch (error) {
    console.error('[ML Client] Error calling ML service for batch:', error)
    return null
  }
}

/**
 * Submit feedback to ML service for model improvement
 */
export async function submitMLFeedback(
  claimId: string,
  adminDecision: 'APPROVED' | 'REJECTED',
  adminId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        claim_id: claimId,
        admin_decision: adminDecision,
        admin_id: adminId
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('[ML Client] Error submitting feedback:', error)
    return false
  }
}

/**
 * Trigger model retraining with accumulated feedback
 */
export async function triggerModelRetrain(minSamples: number = 50): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/retrain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ min_samples: minSamples })
    })
    
    if (!response.ok) {
      return false
    }
    
    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('[ML Client] Error triggering retrain:', error)
    return false
  }
}

/**
 * Get ML model information
 */
export async function getModelInfo(): Promise<{
  exists: boolean
  model_type?: string
  last_modified?: string
  n_estimators?: number
  max_depth?: number
} | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/model/info`)
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Fallback rule-based scoring when ML service is unavailable.
 * Mirrors the logic in lib/fraud-detection.ts
 */
export function getFallbackPrediction(claimData: ClaimData): PredictionResult {
  let fraudScore = 0
  const flags: FraudFlag[] = []
  
  // High amount check
  if (claimData.total_billed > 100000) {
    const points = claimData.total_billed > 200000 ? 30 : 25
    fraudScore += points
    flags.push({
      flag_type: 'HIGH_AMOUNT',
      flag_reason: `Claim amount (KSh ${claimData.total_billed.toLocaleString()}) exceeds threshold`,
      severity: claimData.total_billed > 200000 ? 'HIGH' : 'MEDIUM'
    })
  }
  
  // Round amount check
  if (claimData.total_billed % 1000 === 0 && claimData.total_billed >= 50000) {
    fraudScore += 15
    flags.push({
      flag_type: 'ROUND_AMOUNT',
      flag_reason: 'Suspiciously round billing amount',
      severity: 'LOW'
    })
  }
  
  // High-risk diagnosis codes
  const highRiskPrefixes = ['Z96', 'S72', 'K80', 'C50', 'M17']
  if (claimData.diagnosis_code && highRiskPrefixes.some(p => claimData.diagnosis_code.startsWith(p))) {
    fraudScore += 20
    flags.push({
      flag_type: 'HIGH_RISK_PROCEDURE',
      flag_reason: `Diagnosis ${claimData.diagnosis_code} associated with higher fraud rates`,
      severity: 'MEDIUM'
    })
  }
  
  // Weekend service check
  if (claimData.service_date) {
    const date = new Date(claimData.service_date)
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      fraudScore += 10
      flags.push({
        flag_type: 'WEEKEND_SERVICE',
        flag_reason: 'Service provided on weekend',
        severity: 'LOW'
      })
    }
  }
  
  // Determine label
  let fraudLabel: 'VALID' | 'SUSPICIOUS' | 'FRAUDULENT'
  if (fraudScore <= 30) {
    fraudLabel = 'VALID'
  } else if (fraudScore <= 60) {
    fraudLabel = 'SUSPICIOUS'
  } else {
    fraudLabel = 'FRAUDULENT'
  }
  
  return {
    fraud_score: Math.min(fraudScore, 100),
    fraud_label: fraudLabel,
    confidence: 0.7, // Lower confidence for rule-based
    flags
  }
}

/**
 * Get fraud prediction - tries ML service first, falls back to rules
 */
export async function predictFraudScore(claimData: ClaimData): Promise<PredictionResult> {
  // Try ML service first
  const mlPrediction = await getMLPrediction(claimData)
  
  if (mlPrediction) {
    return mlPrediction
  }
  
  // Fallback to rule-based scoring
  console.log('[ML Client] ML service unavailable, using fallback rules')
  return getFallbackPrediction(claimData)
}
