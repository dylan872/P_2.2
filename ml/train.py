import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
    f1_score
)
from imblearn.over_sampling import SMOTE
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')
from icd11_mapping import get_icd11_category, ICD11_RISK_MAPPING

# Paths
BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODELS_DIR, 'fraud_model.pkl')
FEATURES_PATH = os.path.join(MODELS_DIR, 'feature_names.pkl')

# Feature columns - must match what predict.py sends
FEATURE_COLS = [
    'claim_amount',
    'claim_amount_log',
    'claim_amount_normalized',
    'diagnosis_risk_score',
    'beneficiary_claim_count',
    'beneficiary_avg_claim_amount',
    'service_type_inpatient',
    'service_type_outpatient',
    'service_type_emergency',
    'provider_claim_count',
    'provider_avg_claim_amount',
    'procedure_code_high_risk',
    'quantity',
    'quantity_high',
]


def load_and_prepare_data():
    """Load provided training datasets and create feature matrix with ICD-11 encoding"""
    data_dir = os.path.join(BASE_DIR, 'data')
    
    print('[ML] Loading training datasets...')
    train_df = pd.read_csv(os.path.join(data_dir, 'Train.csv'))
    inpatient_df = pd.read_csv(os.path.join(data_dir, 'Train_Inpatient.csv'))
    beneficiary_df = pd.read_csv(os.path.join(data_dir, 'Train_Beneficiary.csv'))
    cleaned_df = pd.read_csv(os.path.join(data_dir, 'cleaned_data.csv'))
    
    print(f'  Train claims:      {len(train_df)} rows')
    print(f'  Inpatient records: {len(inpatient_df)} rows')
    print(f'  Beneficiary data:  {len(beneficiary_df)} rows')
    print(f'  Cleaned data:      {len(cleaned_df)} rows')
    
    merged_df = train_df.copy()
    
    # Add ICD-11 diagnosis risk scores
    if 'DiagnosisCode' in merged_df.columns:
        merged_df['diagnosis_risk_score'] = merged_df['DiagnosisCode'].apply(
            lambda x: ICD11_RISK_MAPPING.get(get_icd11_category(x), 0) if pd.notna(x) else 0
        )
    else:
        merged_df['diagnosis_risk_score'] = 0
    
    return merged_df


def extract_features(df):
    """Extract features from dataframe with ICD-11 encoding"""
    features_list = []
    
    for idx, row in df.iterrows():
        try:
            features = {}
            
            # Claim amount features
            if 'ClaimAmount' in row:
                amt = float(row['ClaimAmount']) if pd.notna(row['ClaimAmount']) else 0
                features['claim_amount'] = amt
                features['claim_amount_log'] = np.log1p(amt)
                mean_amt = df['ClaimAmount'].astype(float).mean()
                std_amt = df['ClaimAmount'].astype(float).std() + 1e-8
                features['claim_amount_normalized'] = (amt - mean_amt) / std_amt
            else:
                features['claim_amount'] = 0
                features['claim_amount_log'] = 0
                features['claim_amount_normalized'] = 0
            
            # Diagnosis risk (ICD-11)
            features['diagnosis_risk_score'] = row.get('diagnosis_risk_score', 0)
            
            # Beneficiary features
            features['beneficiary_claim_count'] = 1
            features['beneficiary_avg_claim_amount'] = features.get('claim_amount', 0)
            
            if 'BeneficiaryID' in row and not df.empty:
                ben_id = row['BeneficiaryID']
                ben_claims = df[df['BeneficiaryID'] == ben_id]
                features['beneficiary_claim_count'] = len(ben_claims)
                if len(ben_claims) > 0:
                    features['beneficiary_avg_claim_amount'] = ben_claims['ClaimAmount'].astype(float).mean()
            
            # Service type
            features['service_type_inpatient'] = 0
            features['service_type_outpatient'] = 0
            features['service_type_emergency'] = 0
            
            if 'ServiceType' in row and pd.notna(row['ServiceType']):
                service_type = str(row['ServiceType']).strip().upper()
                features['service_type_inpatient'] = 1 if 'INPATIENT' in service_type else 0
                features['service_type_outpatient'] = 1 if 'OUTPATIENT' in service_type else 0
                features['service_type_emergency'] = 1 if 'EMERGENCY' in service_type else 0
            
            # Provider features
            features['provider_claim_count'] = 1
            features['provider_avg_claim_amount'] = features.get('claim_amount', 0)
            
            if 'ProviderID' in row and not df.empty:
                provider_id = row['ProviderID']
                provider_claims = df[df['ProviderID'] == provider_id]
                features['provider_claim_count'] = len(provider_claims)
                if len(provider_claims) > 0:
                    features['provider_avg_claim_amount'] = provider_claims['ClaimAmount'].astype(float).mean()
            
            # Procedure code features
            features['procedure_code_high_risk'] = 0
            if 'ProcedureCode' in row and pd.notna(row['ProcedureCode']):
                proc_code = str(row['ProcedureCode']).strip()
                features['procedure_code_high_risk'] = 1 if proc_code in ['99991', '99992', '99993'] else 0
            
            # Quantity features
            features['quantity'] = 1
            features['quantity_high'] = 0
            
            if 'Quantity' in row and pd.notna(row['Quantity']):
                qty = float(row['Quantity'])
                features['quantity'] = qty
                features['quantity_high'] = 1 if qty > 10 else 0
            
            features_list.append(features)
        
        except Exception as e:
            print(f'[ML] Warning: Could not process row {idx}: {e}')
            continue
    
    return pd.DataFrame(features_list)


def main():
    print('=' * 60)
    print('  ClaimsGuard ML - Model Training')
    print('  Using provided training datasets with ICD-11 encoding')
    print('=' * 60)
    
    # Step 1: Load and prepare data
    print('\n[1/7] Loading and preparing training data...')
    df = load_and_prepare_data()
    print(f'  Dataset shape: {df.shape}')
    
    # Step 2: Extract features with ICD-11 encoding
    print('\n[2/7] Extracting features (with ICD-11 diagnosis codes)...')
    X = extract_features(df)
    
    # Create labels - use all fraud indicators
    y = np.zeros(len(X))
    if 'FraudFlag' in df.columns:
        y = df.loc[X.index, 'FraudFlag'].values
    elif 'Fraud' in df.columns:
        y = df.loc[X.index, 'Fraud'].values
    
    # Ensure all features present
    for col in FEATURE_COLS:
        if col not in X.columns:
            X[col] = 0
    
    X = X[FEATURE_COLS]
    X = X.fillna(0)
    
    print(f'  Features shape: {X.shape}')
    print(f'  Features: {list(X.columns)}')
    print(f'  Fraud samples: {y.sum()} ({y.mean()*100:.1f}%)')
    print(f'  Clean samples: {(y==0).sum()} ({(1-y.mean())*100:.1f}%)')
    
    # Step 3: Train/test split
    print('\n[3/7] Splitting into train and test sets...')
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y if len(np.unique(y)) > 1 else None
    )
    print(f'  Train: {len(X_train)} samples ({y_train.sum()} fraud)')
    print(f'  Test:  {len(X_test)} samples ({y_test.sum()} fraud)')
    
    # Step 4: SMOTE for class imbalance
    print('\n[4/7] Applying SMOTE to balance classes...')
    print(f'  Before SMOTE: {y_train.sum()} fraud / {(y_train==0).sum()} clean')
    
    try:
        smote = SMOTE(random_state=42, k_neighbors=min(5, len([i for i in y_train if i == 1]) - 1))
        X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
        print(f'  After SMOTE:  {y_train_balanced.sum()} fraud / {(y_train_balanced==0).sum()} clean')
    except Exception as e:
        print(f'  SMOTE failed: {e}, using original data')
        X_train_balanced, y_train_balanced = X_train, y_train
    
    # Step 5: Train XGBoost
    print('\n[5/7] Training XGBoost model with ICD-11 features...')
    
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42,
        n_jobs=-1,
    )
    
    model.fit(
        X_train_balanced, y_train_balanced,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    print('  Model trained successfully')
    
    # Step 6: Evaluate
    print('\n[6/7] Evaluating model performance...')
    
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    print('\n  Classification Report:')
    labels = sorted(np.unique(y_test))
    target_names = ['Clean' if label == 0 else 'Fraud' for label in labels]
    print(classification_report(y_test, y_pred, labels=labels, target_names=target_names))
    
    if len(labels) == 2:
        print('  Confusion Matrix:')
        cm = confusion_matrix(y_test, y_pred)
        print(f'    TN (correct clean):     {cm[0][0]}')
        print(f'    FP (wrongly flagged):   {cm[0][1]}')
        print(f'    FN (missed fraud):      {cm[1][0]}')
        print(f'    TP (caught fraud):      {cm[1][1]}')
    else:
        print('  Confusion matrix skipped because only one label is present in the test set.')
    
    if len(labels) > 1:
        auc_roc = roc_auc_score(y_test, y_prob)
        auc_pr = average_precision_score(y_test, y_prob)
        print(f'\n  AUC-ROC: {auc_roc:.4f}')
        print(f'  AUC-PR:  {auc_pr:.4f}')
    else:
        print('  AUC metrics skipped because only one label is present in the test set.')
    
    # Feature importance
    print('\n  Top 10 Most Important Features (with ICD-11):')
    importance = pd.DataFrame({
        'feature': FEATURE_COLS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for _, row in importance.head(10).iterrows():
        bar = '*' * int(row['importance'] * 100)
        print(f'  {row["feature"]:<30} {row["importance"]:.4f}  {bar}')
    
    # Step 7: Save model
    print('\n[7/7] Saving model files...')
    
    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURE_COLS, FEATURES_PATH)
    
    print(f'  Model saved to:    {MODEL_PATH}')
    print(f'  Features saved to: {FEATURES_PATH}')
    
    print('\n' + '=' * 60)
    print('  Training complete! Ready for predictions.')
    print('=' * 60)


def train_model() -> bool:
    """Train the model and return True when finished."""
    main()
    return True


if __name__ == '__main__':
    train_model()
