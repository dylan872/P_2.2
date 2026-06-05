"""
XGBoost Fraud Score Prediction Service
Loads trained model and predicts fraud scores for claims with ICD-11 encoding
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from icd11_mapping import get_icd11_category, ICD11_RISK_MAPPING

# Model paths
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'fraud_model.pkl')
FEATURES_PATH = os.path.join(MODEL_DIR, 'feature_names.pkl')

# Cached model
_model = None
_feature_names = None


def load_model():
    """Load trained XGBoost model and feature names"""
    global _model, _feature_names
    
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run train.py first.")
        _model = joblib.load(MODEL_PATH)
        _feature_names = joblib.load(FEATURES_PATH)
        print(f"[ML] Model loaded with {len(_feature_names)} features")
    
    return _model, _feature_names


def extract_features_from_claim(claim_data: Dict[str, Any], historical_data: Dict[str, Any] = None) -> Dict[str, float]:
    """
    Extract features from claim data with ICD-11 encoding
    
    Args:
        claim_data: Single claim record
        historical_data: Optional historical data for context
    
    Returns:
        Dictionary of extracted features
    """
    features = {}
    
    # Claim amount features
    claim_amount = float(claim_data.get('claim_amount', 0)) or float(claim_data.get('total_billed', 0))
    features['claim_amount'] = claim_amount
    features['claim_amount_log'] = np.log1p(claim_amount)
    features['claim_amount_normalized'] = 0  # Will be normalized in batch
    
    # Diagnosis features with ICD-11
    diagnosis_code = claim_data.get('diagnosis_code')
    if diagnosis_code:
        category = get_icd11_category(diagnosis_code)
        features['diagnosis_risk_score'] = ICD11_RISK_MAPPING.get(category, 0)
    else:
        features['diagnosis_risk_score'] = 0
    
    # Beneficiary features
    features['beneficiary_claim_count'] = historical_data.get('beneficiary_claim_count', 1) if historical_data else 1
    features['beneficiary_avg_claim_amount'] = historical_data.get('beneficiary_avg_claim_amount', claim_amount) if historical_data else claim_amount
    
    # Service type features
    service_type = (claim_data.get('service_type', '') or '').upper()
    features['service_type_inpatient'] = 1 if 'INPATIENT' in service_type else 0
    features['service_type_outpatient'] = 1 if 'OUTPATIENT' in service_type else 0
    features['service_type_emergency'] = 1 if 'EMERGENCY' in service_type else 0
    
    # Provider features
    features['provider_claim_count'] = historical_data.get('provider_claim_count', 1) if historical_data else 1
    features['provider_avg_claim_amount'] = historical_data.get('provider_avg_claim_amount', claim_amount) if historical_data else claim_amount
    
    # Procedure code features
    procedure_code = str(claim_data.get('procedure_code', '')).strip()
    features['procedure_code_high_risk'] = 1 if procedure_code in ['99991', '99992', '99993'] else 0
    
    # Quantity features
    quantity = float(claim_data.get('quantity', 1))
    features['quantity'] = quantity
    features['quantity_high'] = 1 if quantity > 10 else 0
    
    return features


def predict_single_claim(claim_data: Dict[str, Any], historical_data: Dict[str, Any] = None) -> Tuple[float, float]:
    """
    Predict fraud score for a single claim
    
    Args:
        claim_data: Claim details
        historical_data: Historical context for the member/provider
    
    Returns:
        Tuple of (fraud_score, fraud_probability)
    """
    model, feature_names = load_model()
    
    # Extract features
    features = extract_features_from_claim(claim_data, historical_data)
    
    # Create feature array in correct order
    feature_array = np.array([[features.get(f, 0) for f in feature_names]])
    
    # Make prediction
    fraud_prob = model.predict_proba(feature_array)[0][1]
    fraud_score = int(fraud_prob * 100)
    
    return fraud_score, fraud_prob


def predict_batch_claims(claims_data: list, historical_data: Dict[str, Any] = None) -> list:
    """
    Predict fraud scores for multiple claims
    
    Args:
        claims_data: List of claim dictionaries
        historical_data: Optional dictionary mapping claim_id to historical data
    
    Returns:
        List of (claim_id, fraud_score, fraud_prob) tuples
    """
    model, feature_names = load_model()
    results = []
    
    # Extract features for all claims
    feature_list = []
    for claim in claims_data:
        hist_data = (historical_data or {}).get(claim.get('id'), None)
        features = extract_features_from_claim(claim, hist_data)
        feature_list.append(features)
    
    # Create feature matrix
    df_features = pd.DataFrame(feature_list)
    
    # Ensure all features present
    for f in feature_names:
        if f not in df_features.columns:
            df_features[f] = 0
    
    X = df_features[feature_names].fillna(0).values
    
    # Make batch predictions
    fraud_probs = model.predict_proba(X)[:, 1]
    
    # Compile results
    for i, claim in enumerate(claims_data):
        fraud_score = int(fraud_probs[i] * 100)
        results.append({
            'claim_id': claim.get('id'),
            'fraud_score': fraud_score,
            'fraud_probability': fraud_probs[i],
            'fraud_label': 'FRAUDULENT' if fraud_score > 70 else 'SUSPICIOUS' if fraud_score > 40 else 'VALID'
        })
    
    return results


def get_fraud_flags(fraud_score: int) -> list:
    """Generate fraud flags based on score"""
    flags = []
    
    if fraud_score > 70:
        flags.append({'type': 'HIGH_FRAUD_RISK', 'severity': 'HIGH'})
    elif fraud_score > 40:
        flags.append({'type': 'MODERATE_FRAUD_RISK', 'severity': 'MEDIUM'})
    
    return flags


if __name__ == '__main__':
    print("[ML] Prediction service ready")
