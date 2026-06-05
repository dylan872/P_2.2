"""
Seed data generator for ML training.
Generates 10 highly randomized claims across 8 different facilities.
"""

import os
import random
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
import numpy as np

# Set random seed for reproducibility but with high variance
np.random.seed(int(datetime.now().timestamp()) % 10000)
random.seed(int(datetime.now().timestamp()) % 10000)

# 8 Different facilities with realistic Kenyan hospital data
FACILITIES = [
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-NAI-001',
        'facility_name': 'Kenyatta National Hospital',
        'facility_type': 'Level 6',
        'county': 'Nairobi',
        'sub_county': 'Nairobi Central',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-MOM-001',
        'facility_name': 'Coast General Hospital',
        'facility_type': 'Level 5',
        'county': 'Mombasa',
        'sub_county': 'Mvita',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-KIS-001',
        'facility_name': 'Kisumu County Hospital',
        'facility_type': 'Level 5',
        'county': 'Kisumu',
        'sub_county': 'Kisumu Central',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-ELD-001',
        'facility_name': 'Moi Teaching and Referral Hospital',
        'facility_type': 'Level 6',
        'county': 'Uasin Gishu',
        'sub_county': 'Eldoret',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-NAK-001',
        'facility_name': 'Nakuru Level 5 Hospital',
        'facility_type': 'Level 5',
        'county': 'Nakuru',
        'sub_county': 'Nakuru Town East',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-NYR-001',
        'facility_name': 'Nyeri County Referral Hospital',
        'facility_type': 'Level 5',
        'county': 'Nyeri',
        'sub_county': 'Nyeri Central',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-MAC-001',
        'facility_name': 'Machakos Level 5 Hospital',
        'facility_type': 'Level 5',
        'county': 'Machakos',
        'sub_county': 'Machakos Town',
        'is_accredited': True
    },
    {
        'id': str(uuid.uuid4()),
        'facility_code': 'HCP-GAR-001',
        'facility_name': 'Garissa County Hospital',
        'facility_type': 'Level 5',
        'county': 'Garissa',
        'sub_county': 'Garissa',
        'is_accredited': False  # One non-accredited for variety
    }
]

# Diverse patient pool
PATIENTS = [
    {'name': 'Amina Hassan Mohamed', 'gender': 'FEMALE', 'dob': '1992-08-17', 'national_id': '31847265'},
    {'name': 'Otieno Juma Ochieng', 'gender': 'MALE', 'dob': '1978-02-23', 'national_id': '18492736'},
    {'name': 'Wanjiku Grace Muthoni', 'gender': 'FEMALE', 'dob': '1965-11-05', 'national_id': '09283746'},
    {'name': 'Kipchoge Elijah Rotich', 'gender': 'MALE', 'dob': '1988-06-30', 'national_id': '27364819'},
    {'name': 'Fatuma Abdi Omar', 'gender': 'FEMALE', 'dob': '2001-03-12', 'national_id': '42918374'},
    {'name': 'Mwangi Peter Kamau', 'gender': 'MALE', 'dob': '1955-09-28', 'national_id': '05817293'},
    {'name': 'Nekesa Florence Wafula', 'gender': 'FEMALE', 'dob': '1983-12-01', 'national_id': '29384756'},
    {'name': 'Odhiambo James Otieno', 'gender': 'MALE', 'dob': '1995-07-19', 'national_id': '38471926'},
    {'name': 'Chebet Mercy Kosgei', 'gender': 'FEMALE', 'dob': '1970-04-08', 'national_id': '14729385'},
    {'name': 'Karanja David Njoroge', 'gender': 'MALE', 'dob': '1999-01-25', 'national_id': '46281937'}
]

# Diverse diagnosis codes with varying fraud risk levels
DIAGNOSES = [
    # Low risk - common outpatient
    {'code': 'J06.9', 'desc': 'Acute upper respiratory infection, unspecified', 'risk': 'low', 'avg_cost': 3500},
    {'code': 'K29.7', 'desc': 'Gastritis, unspecified', 'risk': 'low', 'avg_cost': 4200},
    {'code': 'R51', 'desc': 'Headache', 'risk': 'low', 'avg_cost': 2800},
    {'code': 'N39.0', 'desc': 'Urinary tract infection, site not specified', 'risk': 'low', 'avg_cost': 5100},
    # Medium risk - chronic conditions
    {'code': 'I10', 'desc': 'Essential (primary) hypertension', 'risk': 'medium', 'avg_cost': 15000},
    {'code': 'E11.9', 'desc': 'Type 2 diabetes mellitus without complications', 'risk': 'medium', 'avg_cost': 18500},
    {'code': 'J45.909', 'desc': 'Unspecified asthma, uncomplicated', 'risk': 'medium', 'avg_cost': 12000},
    # High risk - surgical/major procedures
    {'code': 'K80.20', 'desc': 'Calculus of gallbladder without cholecystitis', 'risk': 'high', 'avg_cost': 85000},
    {'code': 'Z96.641', 'desc': 'Presence of right artificial hip joint', 'risk': 'high', 'avg_cost': 450000},
    {'code': 'S72.001A', 'desc': 'Fracture of unspecified part of neck of right femur', 'risk': 'high', 'avg_cost': 320000}
]

SERVICE_TYPES = ['OUTPATIENT', 'INPATIENT', 'DAYCARE', 'DENTAL', 'OPTICAL', 
                 'MATERNITY', 'SURGICAL', 'EMERGENCY', 'CHRONIC', 'PREVENTIVE']

INSURER_TYPES = ['SHA', 'NHIF', 'PRIVATE']

def generate_random_amount(diagnosis: Dict, is_fraud: bool) -> float:
    """Generate claim amount with realistic variance."""
    base = diagnosis['avg_cost']
    
    if is_fraud:
        # Fraudulent claims: inflated amounts, round numbers
        multiplier = random.uniform(2.5, 5.0)
        amount = base * multiplier
        # Often rounded to suspicious amounts
        if random.random() > 0.3:
            amount = round(amount / 10000) * 10000
    else:
        # Legitimate claims: normal variance around average
        variance = random.uniform(0.7, 1.4)
        amount = base * variance
        # Add some random cents
        amount += random.randint(0, 999)
    
    return round(amount, 2)

def generate_random_date(days_back_max: int = 180) -> datetime:
    """Generate a random service date within the past N days."""
    days_back = random.randint(1, days_back_max)
    return datetime.now() - timedelta(days=days_back)

def generate_submission_delay(service_date: datetime, is_fraud: bool) -> datetime:
    """Generate submission date with realistic delay."""
    if is_fraud:
        # Fraudulent claims sometimes submitted same day or with unusual delays
        delay = random.choice([0, 1, random.randint(30, 90)])
    else:
        # Normal claims: 1-14 days delay typically
        delay = random.randint(1, 14)
    
    return service_date + timedelta(days=delay)

def generate_10_claims() -> List[Dict[str, Any]]:
    """
    Generate 10 highly randomized claims across 8 facilities.
    Mix of valid, suspicious, and fraudulent claims.
    """
    claims = []
    
    # Ensure we use 8 different facilities (some will have 2 claims, most have 1)
    facility_assignments = random.sample(FACILITIES, 8) + random.sample(FACILITIES, 2)
    random.shuffle(facility_assignments)
    
    # Distribute fraud labels: 5 valid, 3 suspicious, 2 fraudulent
    fraud_labels = ['VALID'] * 5 + ['SUSPICIOUS'] * 3 + ['FRAUDULENT'] * 2
    random.shuffle(fraud_labels)
    
    # Use different patients for each claim
    patients = random.sample(PATIENTS, 10)
    
    for i in range(10):
        facility = facility_assignments[i]
        patient = patients[i]
        fraud_label = fraud_labels[i]
        is_fraud = fraud_label == 'FRAUDULENT'
        is_suspicious = fraud_label == 'SUSPICIOUS'
        
        # Select diagnosis based on fraud level
        if is_fraud:
            diagnosis = random.choice([d for d in DIAGNOSES if d['risk'] == 'high'])
        elif is_suspicious:
            diagnosis = random.choice([d for d in DIAGNOSES if d['risk'] in ['medium', 'high']])
        else:
            diagnosis = random.choice(DIAGNOSES)
        
        # Generate dates
        service_date = generate_random_date(180)
        submission_date = generate_submission_delay(service_date, is_fraud)
        
        # Select service type based on diagnosis risk
        if diagnosis['risk'] == 'high':
            service_type = random.choice(['SURGICAL', 'INPATIENT', 'EMERGENCY'])
        elif diagnosis['risk'] == 'medium':
            service_type = random.choice(['OUTPATIENT', 'CHRONIC', 'INPATIENT'])
        else:
            service_type = random.choice(['OUTPATIENT', 'DENTAL', 'OPTICAL', 'PREVENTIVE'])
        
        # Generate amount
        total_billed = generate_random_amount(diagnosis, is_fraud or is_suspicious)
        
        # Calculate fraud score based on characteristics
        fraud_score = 0
        if total_billed > 100000:
            fraud_score += random.randint(15, 30)
        if total_billed % 10000 == 0 and total_billed >= 50000:
            fraud_score += random.randint(10, 20)
        if service_date.weekday() >= 5:
            fraud_score += random.randint(5, 15)
        if diagnosis['risk'] == 'high':
            fraud_score += random.randint(10, 25)
        if not facility['is_accredited']:
            fraud_score += random.randint(15, 25)
        
        # Add randomness to score
        fraud_score += random.randint(-10, 15)
        fraud_score = max(0, min(100, fraud_score))
        
        # Adjust score based on label for training consistency
        if fraud_label == 'VALID':
            fraud_score = min(fraud_score, random.randint(5, 30))
        elif fraud_label == 'SUSPICIOUS':
            fraud_score = max(min(fraud_score, 60), random.randint(31, 55))
        else:  # FRAUDULENT
            fraud_score = max(fraud_score, random.randint(65, 95))
        
        claim = {
            'id': str(uuid.uuid4()),
            'claim_number': f"CLM-2026-{str(i+1).zfill(6)}",
            'member_id': str(uuid.uuid4()),
            'member_number': f"SHA-2024-{random.randint(100000, 999999)}",
            'member_name': patient['name'],
            'national_id': patient['national_id'],
            'gender': patient['gender'],
            'date_of_birth': patient['dob'],
            'insurer_type': random.choice(INSURER_TYPES),
            'provider_id': facility['id'],
            'facility_code': facility['facility_code'],
            'facility_name': facility['facility_name'],
            'facility_type': facility['facility_type'],
            'county': facility['county'],
            'is_accredited': facility['is_accredited'],
            'service_date': service_date.strftime('%Y-%m-%d'),
            'submission_date': submission_date.strftime('%Y-%m-%d'),
            'diagnosis_code': diagnosis['code'],
            'diagnosis_desc': diagnosis['desc'],
            'service_type': service_type,
            'total_billed': total_billed,
            'approved_amount': total_billed * random.uniform(0.7, 1.0) if fraud_label == 'VALID' else None,
            'status': 'PENDING' if fraud_label == 'VALID' else ('UNDER_REVIEW' if fraud_label == 'SUSPICIOUS' else 'FLAGGED'),
            'fraud_score': fraud_score,
            'fraud_label': fraud_label,
            'notes': f"{'Automated flag: ' + fraud_label if fraud_label != 'VALID' else 'Standard claim processing'}"
        }
        
        claims.append(claim)
    
    return claims

def save_seed_data():
    """Save generated seed data to JSON file."""
    claims = generate_10_claims()
    
    output_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, 'seed_claims.json')
    
    with open(output_path, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'total_claims': len(claims),
            'facilities_used': len(set(c['facility_code'] for c in claims)),
            'claims': claims
        }, f, indent=2)
    
    print(f"Generated {len(claims)} claims across {len(set(c['facility_code'] for c in claims))} facilities")
    print(f"Saved to: {output_path}")
    
    # Print summary
    print("\nClaims Summary:")
    print("-" * 80)
    for claim in claims:
        print(f"{claim['claim_number']} | {claim['member_name'][:25]:<25} | "
              f"{claim['facility_name'][:30]:<30} | "
              f"KSh {claim['total_billed']:>12,.2f} | "
              f"Score: {claim['fraud_score']:>3} | {claim['fraud_label']}")
    
    return claims

if __name__ == "__main__":
    save_seed_data()
