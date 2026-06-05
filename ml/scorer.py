"""
ML Scorer wrapper - calls XGBoost model for fraud prediction
Place this file in ml/scorer.py to be called from backend
"""

import sys
import json
from predict import predict_single_claim, predict_batch_claims, get_fraud_flags

def score_claim(claim_data, historical_data=None):
    """
    Score a single claim for fraud
    
    Args:
        claim_data: dict with claim details
        historical_data: dict with member/provider history
    
    Returns:
        dict with fraud_score, fraud_label, flags
    """
    try:
        fraud_score, fraud_prob = predict_single_claim(claim_data, historical_data)
        
        # Determine label based on score
        if fraud_score > 70:
            fraud_label = "FRAUDULENT"
        elif fraud_score > 40:
            fraud_label = "SUSPICIOUS"
        else:
            fraud_label = "VALID"
        
        flags = get_fraud_flags(fraud_score)
        
        return {
            "fraud_score": fraud_score,
            "fraud_probability": fraud_prob,
            "fraud_label": fraud_label,
            "flags": flags
        }
    except Exception as e:
        print(f"[Scorer Error] {e}", file=sys.stderr)
        return {
            "fraud_score": 0,
            "fraud_probability": 0,
            "fraud_label": "VALID",
            "flags": []
        }

def score_batch(claims_data, historical_data=None):
    """Score multiple claims"""
    try:
        return predict_batch_claims(claims_data, historical_data)
    except Exception as e:
        print(f"[Batch Scorer Error] {e}", file=sys.stderr)
        return []

if __name__ == '__main__':
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    claim_data = input_data.get('claim_data', {})
    historical_data = input_data.get('historical_data', {})
    
    result = score_claim(claim_data, historical_data)
    print(json.dumps(result))
