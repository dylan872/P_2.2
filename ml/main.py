"""
Main entry point for the ML fraud detection service.
Provides a Flask API for the Next.js backend to call.
"""

import os
import sys
from flask import Flask, request, jsonify

try:
    from flask_cors import CORS
    _CORS_AVAILABLE = True
except ImportError:
    CORS = None
    _CORS_AVAILABLE = False

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from predict import predict_single_claim as predict_fraud_score, predict_batch_claims as batch_predict
from train import train_model
from feedback import update_model_with_feedback, record_prediction_feedback

app = Flask(__name__)

if _CORS_AVAILABLE:
    CORS(app)
else:
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
        return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'fraud-detection-ml'})

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict fraud score for a single claim.
    
    Request body:
    {
        "total_billed": 50000,
        "service_type": "OUTPATIENT",
        "diagnosis_code": "J06.9",
        "service_date": "2026-05-10",
        "submission_date": "2026-05-12",
        "facility_type": "Level 5",
        "county": "Nairobi",
        "gender": "MALE",
        "date_of_birth": "1985-03-15",
        "insurer_type": "SHA"
    }
    
    Response:
    {
        "fraud_score": 25,
        "fraud_label": "VALID",
        "confidence": 0.85,
        "flags": []
    }
    """
    try:
        claim_data = request.get_json()
        if not claim_data:
            return jsonify({'error': 'No claim data provided'}), 400
        
        result = predict_fraud_score(claim_data)
        return jsonify(result)
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e), 'hint': 'Run train.py first to create the model'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict fraud scores for multiple claims.
    
    Request body:
    {
        "claims": [
            { ... claim data ... },
            { ... claim data ... }
        ]
    }
    """
    try:
        data = request.get_json()
        claims = data.get('claims', [])
        
        if not claims:
            return jsonify({'error': 'No claims provided'}), 400
        
        results = batch_predict(claims)
        return jsonify({'predictions': results})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """
    Record admin feedback on a prediction.
    
    Request body:
    {
        "claim_id": "uuid",
        "admin_decision": "APPROVED" | "REJECTED",
        "admin_id": "uuid"
    }
    """
    try:
        data = request.get_json()
        claim_id = data.get('claim_id')
        admin_decision = data.get('admin_decision')
        admin_id = data.get('admin_id')
        
        if not all([claim_id, admin_decision, admin_id]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if admin_decision not in ['APPROVED', 'REJECTED']:
            return jsonify({'error': 'Invalid admin_decision'}), 400
        
        record_prediction_feedback(claim_id, admin_decision, admin_id)
        return jsonify({'success': True, 'message': 'Feedback recorded'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """
    Trigger model retraining with feedback data.
    
    Request body:
    {
        "min_samples": 50  // optional, default 50
    }
    """
    try:
        data = request.get_json() or {}
        min_samples = data.get('min_samples', 50)
        
        success = update_model_with_feedback(min_samples=min_samples)
        
        if success:
            return jsonify({'success': True, 'message': 'Model retrained successfully'})
        else:
            return jsonify({'success': False, 'message': 'Not enough samples for retraining'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/train/initial', methods=['POST'])
def initial_train():
    """
    Run initial model training with synthetic/seed data.
    Use this to create the initial model before predictions can be made.
    """
    try:
        success = train_model()
        if success:
            return jsonify({'success': True, 'message': 'Initial model trained successfully'})
        else:
            return jsonify({'success': False, 'message': 'Training failed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get information about the current model."""
    try:
        model_dir = os.path.join(os.path.dirname(__file__), 'models')
        model_path = os.path.join(model_dir, 'xgboost_fraud_model.joblib')
        
        if not os.path.exists(model_path):
            return jsonify({
                'exists': False,
                'message': 'No model trained yet'
            })
        
        import joblib
        from datetime import datetime
        
        model_stat = os.stat(model_path)
        model = joblib.load(model_path)
        
        return jsonify({
            'exists': True,
            'model_type': 'XGBoost',
            'last_modified': datetime.fromtimestamp(model_stat.st_mtime).isoformat(),
            'file_size_kb': model_stat.st_size / 1024,
            'n_estimators': model.n_estimators,
            'max_depth': model.max_depth
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('ML_SERVICE_PORT', 5001))
    debug = os.environ.get('ML_DEBUG', 'false').lower() == 'true'
    
    print(f"Starting ML Fraud Detection Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
