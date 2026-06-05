"""
Feedback loop for model improvement based on admin reviews.
Updates model with confirmed fraud/valid labels from admin dashboard.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional, Dict, Any, List

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None

# Database connection using environment variables
def get_db_connection():
    """Get PostgreSQL database connection."""
    if psycopg2 is None:
        raise RuntimeError(
            'psycopg2 is not installed. Install ML dependencies with: pip install -r requirements.txt'
        )
    return psycopg2.connect(
        host=os.environ.get('PG_HOST', 'localhost'),
        port=os.environ.get('PG_PORT', '5432'),
        database=os.environ.get('PG_DATABASE', 'claims_guard'),
        user=os.environ.get('PG_USER', 'postgres'),
        password=os.environ.get('PG_PASSWORD', '')
    )

def get_reviewed_claims(min_reviews: int = 50) -> pd.DataFrame:
    """
    Fetch claims that have been reviewed by admin with confirmed labels.
    These are used for retraining the model.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT 
                c.id,
                c.total_billed,
                c.fraud_score as ml_fraud_score,
                c.fraud_label as ml_fraud_label,
                c.status,
                c.service_type,
                c.diagnosis_code,
                c.service_date,
                c.submission_date,
                c.reviewed_at,
                p.facility_type,
                p.county,
                m.gender,
                m.date_of_birth,
                m.insurer_type,
                -- Admin confirmed label (APPROVED = valid, REJECTED = fraud)
                CASE 
                    WHEN c.status = 'APPROVED' THEN 0
                    WHEN c.status = 'REJECTED' THEN 1
                    ELSE NULL
                END as confirmed_label
            FROM claims c
            LEFT JOIN providers p ON c.provider_id = p.id
            LEFT JOIN members m ON c.member_id = m.id
            WHERE c.status IN ('APPROVED', 'REJECTED')
            AND c.reviewed_at IS NOT NULL
        """
        df = pd.read_sql(query, conn)
        return df
    finally:
        conn.close()

def prepare_feedback_features(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare features from reviewed claims for retraining."""
    from prepare_data import extract_features
    
    features_list = []
    for _, row in df.iterrows():
        claim_data = {
            'total_billed': float(row['total_billed']),
            'service_type': row['service_type'],
            'diagnosis_code': row['diagnosis_code'],
            'service_date': row['service_date'],
            'submission_date': row['submission_date'],
            'facility_type': row['facility_type'],
            'county': row['county'],
            'gender': row['gender'],
            'date_of_birth': row['date_of_birth'],
            'insurer_type': row['insurer_type']
        }
        features = extract_features(claim_data)
        features['confirmed_label'] = row['confirmed_label']
        features_list.append(features)
    
    return pd.DataFrame(features_list)

def update_model_with_feedback(min_samples: int = 50):
    """
    Retrain model with feedback from admin reviews.
    Only retrains if enough reviewed samples are available.
    """
    print("Fetching reviewed claims for feedback...")
    df = get_reviewed_claims()
    
    if len(df) < min_samples:
        print(f"Not enough reviewed claims ({len(df)}/{min_samples}). Skipping retrain.")
        return False
    
    print(f"Found {len(df)} reviewed claims. Preparing features...")
    features_df = prepare_feedback_features(df)
    
    # Load existing model and scaler
    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    model_path = os.path.join(model_dir, 'xgboost_fraud_model.joblib')
    scaler_path = os.path.join(model_dir, 'scaler.joblib')
    
    if not os.path.exists(model_path):
        print("No existing model found. Run train.py first.")
        return False
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    # Prepare training data
    feature_cols = [col for col in features_df.columns if col != 'confirmed_label']
    X = features_df[feature_cols].values
    y = features_df['confirmed_label'].values
    
    # Scale features
    X_scaled = scaler.transform(X)
    
    # Incremental training (partial fit simulation via continued training)
    print("Updating model with feedback data...")
    model.fit(X_scaled, y, xgb_model=model.get_booster())
    
    # Save updated model with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(model_dir, f'xgboost_fraud_model_{timestamp}.joblib')
    joblib.dump(model, backup_path)
    joblib.dump(model, model_path)
    
    print(f"Model updated and saved. Backup at: {backup_path}")
    return True

def record_prediction_feedback(claim_id: str, admin_decision: str, admin_id: str):
    """
    Record admin feedback on a prediction for future model improvement.
    
    Args:
        claim_id: The claim ID
        admin_decision: 'APPROVED' or 'REJECTED'
        admin_id: The admin who made the decision
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE claims 
                SET status = %s,
                    reviewed_at = NOW(),
                    reviewed_by = %s
                WHERE id = %s
            """, (admin_decision, admin_id, claim_id))
            conn.commit()
            print(f"Recorded feedback for claim {claim_id}: {admin_decision}")
    finally:
        conn.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Model feedback and retraining')
    parser.add_argument('--retrain', action='store_true', help='Retrain model with feedback')
    parser.add_argument('--min-samples', type=int, default=50, help='Minimum samples for retraining')
    
    args = parser.parse_args()
    
    if args.retrain:
        update_model_with_feedback(min_samples=args.min_samples)
    else:
        print("Use --retrain to update model with admin feedback")
