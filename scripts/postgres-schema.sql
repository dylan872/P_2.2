-- Claims Guard PostgreSQL Schema
-- Run this script to set up a fresh PostgreSQL database

-- Create enums
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE cover_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');
CREATE TYPE claim_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED');
CREATE TYPE fraud_label AS ENUM ('VALID', 'SUSPICIOUS', 'FRAUDULENT');
CREATE TYPE service_type AS ENUM ('OUTPATIENT', 'INPATIENT', 'DAYCARE', 'DENTAL', 'OPTICAL', 'MATERNITY', 'SURGICAL', 'EMERGENCY', 'CHRONIC', 'PREVENTIVE');
CREATE TYPE insurer_type AS ENUM ('SHA', 'NHIF', 'PRIVATE');

-- Members table (users who login with memberNumber + nationalId)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_number VARCHAR(50) UNIQUE NOT NULL,
  national_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  insurer_type insurer_type DEFAULT 'SHA',
  policy_number VARCHAR(50),
  cover_status cover_status DEFAULT 'ACTIVE',
  cover_expiry DATE,
  profile_picture TEXT,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Providers table (healthcare facilities)
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_code VARCHAR(50) UNIQUE NOT NULL,
  facility_name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(100),
  county VARCHAR(100),
  sub_county VARCHAR(100),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  is_accredited BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims table
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number VARCHAR(50) UNIQUE NOT NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  diagnosis_code VARCHAR(20),
  diagnosis_desc TEXT,
  service_type service_type DEFAULT 'OUTPATIENT',
  total_billed DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  status claim_status DEFAULT 'PENDING',
  fraud_score INTEGER DEFAULT 0,
  fraud_label fraud_label DEFAULT 'VALID',
  notes TEXT,
  submission_date TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  viewed_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim line items
CREATE TABLE claim_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  procedure_code VARCHAR(20),
  procedure_desc TEXT,
  quantity INTEGER DEFAULT 1,
  unit_cost DECIMAL(12,2),
  total_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud flags table (for ML model results)
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  flag_type VARCHAR(100) NOT NULL,
  flag_reason TEXT,
  severity VARCHAR(20) DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_members_member_number ON members(member_number);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_claims_member_id ON claims(member_id);
CREATE INDEX idx_claims_provider_id ON claims(provider_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_fraud_label ON claims(fraud_label);
CREATE INDEX idx_claims_submission_date ON claims(submission_date);
CREATE INDEX idx_claims_viewed_by_admin ON claims(viewed_by_admin);
CREATE INDEX idx_claim_line_items_claim_id ON claim_line_items(claim_id);

-- Supporting documents table (uploaded during fraud review)
CREATE TABLE IF NOT EXISTS claim_supporting_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type VARCHAR(100),
    uploaded_by VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_claim_supporting_documents_claim_id ON claim_supporting_documents(claim_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(claim_number FROM 10) AS INTEGER)), 0) + 1 INTO seq_num
  FROM claims WHERE claim_number LIKE 'CLM-' || year_part || '-%';
  NEW.claim_number := 'CLM-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_claim_number_trigger BEFORE INSERT ON claims FOR EACH ROW WHEN (NEW.claim_number IS NULL OR NEW.claim_number = '') EXECUTE FUNCTION generate_claim_number();
