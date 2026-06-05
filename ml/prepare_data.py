"""
ClaimsGuard ML - Data Preparation with ICD-11 Support
======================================================
Prepares training data from the provided healthcare claims datasets.
Uses ICD-11 mapping for disease classification features.

Run: python prepare_data.py
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime
from icd11_mapping import extract_diagnosis_features, extract_procedure_features, map_to_icd11

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_PATH = os.path.join(DATA_DIR, 'training_features.csv')


def load_training_data() -> tuple:
    """Load all training data files"""
    print("Loading training data files...")
    
    # Load provider fraud labels
    train_labels = pd.read_csv(os.path.join(DATA_DIR, 'Train.csv'))
    train_labels['PotentialFraud'] = (train_labels['PotentialFraud'] == 'Yes').astype(int)
    print(f"  Loaded {len(train_labels)} provider labels ({train_labels['PotentialFraud'].sum()} fraudulent)")
    
    # Load inpatient claims
    inpatient = pd.read_csv(os.path.join(DATA_DIR, 'Train_Inpatient.csv'))
    inpatient['ClaimType'] = 'Inpatient'
    print(f"  Loaded {len(inpatient)} inpatient claims")
    
    # Load beneficiary data
    beneficiary = pd.read_csv(os.path.join(DATA_DIR, 'Train_Beneficiary.csv'))
    print(f"  Loaded {len(beneficiary)} beneficiaries")
    
    return train_labels, inpatient, beneficiary


def calculate_age(dob, claim_date) -> int:
    """Calculate age at time of claim"""
    try:
        birth = pd.to_datetime(dob)
        claim = pd.to_datetime(claim_date)
        return max(0, int((claim - birth).days / 365.25))
    except:
        return 70


def calculate_duration(start_date, end_date) -> int:
    """Calculate duration in days"""
    try:
        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)
        return max(1, (end - start).days)
    except:
        return 1


def extract_claim_features(claims: pd.DataFrame, beneficiary: pd.DataFrame) -> pd.DataFrame:
    """Extract features from individual claims with ICD-11 mapping"""
    print("Extracting claim-level features with ICD-11 mapping...")
    
    # Merge claims with beneficiary data
    merged = claims.merge(beneficiary, on='BeneID', how='left')
    
    features_list = []
    total = len(merged)
    
    for idx, row in merged.iterrows():
        if idx % 5000 == 0:
            print(f"  Processing {idx}/{total} claims...")
        
        feat = {
            'Provider': row['Provider'],
            'BeneID': row['BeneID'],
            'ClaimID': row['ClaimID'],
            'ClaimType': row.get('ClaimType', 'Inpatient'),
            'InscClaimAmtReimbursed': float(row.get('InscClaimAmtReimbursed') or 0),
            'DeductibleAmtPaid': float(row.get('DeductibleAmtPaid') or 0),
        }
        
        # Age at claim
        feat['Age'] = calculate_age(row.get('DOB'), row.get('ClaimStartDt'))
        
        # Hospital stay duration
        feat['StayDuration'] = calculate_duration(row.get('AdmissionDt'), row.get('DischargeDt'))
        
        # Claim duration
        feat['ClaimDuration'] = calculate_duration(row.get('ClaimStartDt'), row.get('ClaimEndDt'))
        
        # Demographics
        feat['Gender'] = int(row.get('Gender') or 1)
        feat['Race'] = int(row.get('Race') or 1)
        feat['State'] = int(row.get('State') or 0)
        
        # Renal disease
        feat['RenalDisease'] = 1 if str(row.get('RenalDiseaseIndicator')).upper() == 'Y' else 0
        
        # Coverage
        feat['PartACovMonths'] = int(row.get('NoOfMonths_PartACov') or 12)
        feat['PartBCovMonths'] = int(row.get('NoOfMonths_PartBCov') or 12)
        
        # Chronic conditions (1=Yes, 2=No in original data)
        chronic_cols = [
            'ChronicCond_Alzheimer', 'ChronicCond_Heartfailure',
            'ChronicCond_KidneyDisease', 'ChronicCond_Cancer',
            'ChronicCond_ObstrPulmonary', 'ChronicCond_Depression',
            'ChronicCond_Diabetes', 'ChronicCond_IschemicHeart',
            'ChronicCond_Osteoporasis', 'ChronicCond_rheumatoidarthritis',
            'ChronicCond_stroke'
        ]
        
        chronic_count = 0
        for col in chronic_cols:
            val = row.get(col)
            has_condition = 1 if val == 1 else 0
            feat[col] = has_condition
            chronic_count += has_condition
        feat['ChronicCondCount'] = chronic_count
        
        # Annual amounts
        feat['IPAnnualReimbursementAmt'] = float(row.get('IPAnnualReimbursementAmt') or 0)
        feat['OPAnnualReimbursementAmt'] = float(row.get('OPAnnualReimbursementAmt') or 0)
        feat['IPAnnualDeductibleAmt'] = float(row.get('IPAnnualDeductibleAmt') or 0)
        feat['OPAnnualDeductibleAmt'] = float(row.get('OPAnnualDeductibleAmt') or 0)
        
        # Deceased indicator
        feat['IsDeceased'] = 1 if pd.notna(row.get('DOD')) else 0
        
        # Physician indicators
        feat['HasAttendingPhysician'] = 1 if pd.notna(row.get('AttendingPhysician')) and str(row.get('AttendingPhysician')) != 'NA' else 0
        feat['HasOperatingPhysician'] = 1 if pd.notna(row.get('OperatingPhysician')) and str(row.get('OperatingPhysician')) != 'NA' else 0
        feat['HasOtherPhysician'] = 1 if pd.notna(row.get('OtherPhysician')) and str(row.get('OtherPhysician')) != 'NA' else 0
        feat['PhysicianCount'] = feat['HasAttendingPhysician'] + feat['HasOperatingPhysician'] + feat['HasOtherPhysician']
        
        # Extract diagnosis codes with ICD-11 mapping
        diag_codes = []
        for i in range(1, 11):
            code = row.get(f'ClmDiagnosisCode_{i}')
            if pd.notna(code) and str(code) != 'NA':
                diag_codes.append(str(code))
        
        diag_features = extract_diagnosis_features(diag_codes)
        feat.update(diag_features)
        
        # Map primary diagnosis to ICD-11
        if diag_codes:
            primary_mapping = map_to_icd11(diag_codes[0])
            feat['PrimaryDiagICD11'] = primary_mapping.get('icd11') or 'Unknown'
            feat['PrimaryDiagChapter'] = primary_mapping.get('chapter') or 'XX'
            feat['PrimaryDiagRisk'] = primary_mapping.get('risk_weight', 1.0)
        else:
            feat['PrimaryDiagICD11'] = 'Unknown'
            feat['PrimaryDiagChapter'] = 'XX'
            feat['PrimaryDiagRisk'] = 1.0
        
        # Extract procedure codes
        proc_codes = []
        for i in range(1, 7):
            code = row.get(f'ClmProcedureCode_{i}')
            if pd.notna(code) and str(code) != 'NA':
                proc_codes.append(str(int(float(code))))
        
        proc_features = extract_procedure_features(proc_codes)
        feat.update(proc_features)
        
        features_list.append(feat)
    
    return pd.DataFrame(features_list)


def aggregate_provider_features(claim_features: pd.DataFrame, train_labels: pd.DataFrame) -> pd.DataFrame:
    """Aggregate claim features to provider level"""
    print("Aggregating to provider level...")
    
    # Group by provider
    agg_dict = {
        'ClaimID': 'count',
        'BeneID': 'nunique',
        'InscClaimAmtReimbursed': ['sum', 'mean', 'max', 'std'],
        'DeductibleAmtPaid': ['sum', 'mean'],
        'Age': ['mean', 'std'],
        'StayDuration': ['mean', 'max'],
        'ClaimDuration': ['mean', 'max'],
        'ChronicCondCount': 'mean',
        'num_diagnoses': ['mean', 'max'],
        'num_procedures': ['mean', 'max'],
        'total_risk_weight': ['mean', 'max'],
        'max_risk_weight': 'max',
        'has_cardiovascular': 'sum',
        'has_respiratory': 'sum',
        'has_diabetes': 'sum',
        'has_kidney': 'sum',
        'has_cancer': 'sum',
        'has_infection': 'sum',
        'has_injury': 'sum',
        'has_high_cost_procedure': 'sum',
        'IsDeceased': 'sum',
        'PhysicianCount': 'mean',
        'unique_chapters': 'mean',
    }
    
    provider_stats = claim_features.groupby('Provider').agg(agg_dict).reset_index()
    
    # Flatten column names
    provider_stats.columns = [
        'Provider', 'TotalClaims', 'UniqueBeneficiaries',
        'TotalReimbursed', 'AvgReimbursed', 'MaxReimbursed', 'StdReimbursed',
        'TotalDeductible', 'AvgDeductible',
        'AvgAge', 'StdAge',
        'AvgStayDuration', 'MaxStayDuration',
        'AvgClaimDuration', 'MaxClaimDuration',
        'AvgChronicCount',
        'AvgDiagnoses', 'MaxDiagnoses',
        'AvgProcedures', 'MaxProcedures',
        'AvgRiskWeight', 'MaxRiskWeight', 'OverallMaxRisk',
        'CardiovascularClaims', 'RespiratoryClaims', 'DiabetesClaims',
        'KidneyClaims', 'CancerClaims', 'InfectionClaims', 'InjuryClaims',
        'HighCostProcedureClaims', 'DeceasedPatients',
        'AvgPhysicianCount', 'AvgUniqueChapters'
    ]
    
    # Calculate derived features
    provider_stats['ClaimsPerPatient'] = provider_stats['TotalClaims'] / provider_stats['UniqueBeneficiaries'].clip(lower=1)
    provider_stats['HighCostRatio'] = provider_stats['HighCostProcedureClaims'] / provider_stats['TotalClaims'].clip(lower=1)
    provider_stats['DeceasedRatio'] = provider_stats['DeceasedPatients'] / provider_stats['UniqueBeneficiaries'].clip(lower=1)
    provider_stats['CardiovascularRatio'] = provider_stats['CardiovascularClaims'] / provider_stats['TotalClaims'].clip(lower=1)
    provider_stats['CancerRatio'] = provider_stats['CancerClaims'] / provider_stats['TotalClaims'].clip(lower=1)
    
    # Merge with fraud labels
    provider_stats = provider_stats.merge(train_labels, on='Provider', how='left')
    provider_stats['FraudLabel'] = provider_stats['PotentialFraud'].fillna(0).astype(int)
    provider_stats = provider_stats.drop('PotentialFraud', axis=1)
    
    # Fill NaN values
    provider_stats = provider_stats.fillna(0)
    
    print(f"  Generated features for {len(provider_stats)} providers")
    print(f"  Fraudulent: {provider_stats['FraudLabel'].sum()} ({provider_stats['FraudLabel'].mean()*100:.1f}%)")
    
    return provider_stats


def main():
    print('=' * 60)
    print('  ClaimsGuard ML - Data Preparation with ICD-11')
    print('=' * 60)
    
    # Load data
    train_labels, inpatient, beneficiary = load_training_data()
    
    # Extract claim-level features
    claim_features = extract_claim_features(inpatient, beneficiary)
    claim_features.to_csv(os.path.join(DATA_DIR, 'claim_features.csv'), index=False)
    print(f"  Saved claim features: {len(claim_features)} records")
    
    # Aggregate to provider level
    provider_features = aggregate_provider_features(claim_features, train_labels)
    provider_features.to_csv(OUTPUT_PATH, index=False)
    print(f"  Saved provider features: {len(provider_features)} records")
    
    print('\n' + '=' * 60)
    print('  Data preparation complete.')
    print(f'  Output: {OUTPUT_PATH}')
    print('  Next step: python train.py')
    print('=' * 60)
    
    return provider_features


if __name__ == '__main__':
    main()
