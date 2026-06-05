-- Claims Guard PostgreSQL Schema
-- Run this script in pgAdmin or psql to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS fraud_flags CASCADE;
DROP TABLE IF EXISTS claim_line_items CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS claim_status CASCADE;
DROP TYPE IF EXISTS fraud_label CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;

-- Create enum types
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE claim_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED');
CREATE TYPE fraud_label AS ENUM ('VALID', 'SUSPICIOUS', 'FRAUDULENT');
CREATE TYPE service_type AS ENUM ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'DENTAL', 'OPTICAL', 'MATERNITY', 'SURGICAL');

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_number VARCHAR(50) UNIQUE NOT NULL,
    national_id VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    insurer_type VARCHAR(50) DEFAULT 'SHA',
    policy_number VARCHAR(50),
    cover_status VARCHAR(20) DEFAULT 'ACTIVE',
    cover_expiry DATE,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Providers table
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    facility_name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(50),
    county VARCHAR(100),
    sub_county VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    is_accredited BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claims table with ML scoring fields
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(50) UNIQUE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    diagnosis_code VARCHAR(20),
    diagnosis_desc TEXT,
    icd11_code VARCHAR(20),
    service_type service_type DEFAULT 'OUTPATIENT',
    total_billed DECIMAL(12, 2) NOT NULL,
    approved_amount DECIMAL(12, 2),
    status claim_status DEFAULT 'PENDING',
    fraud_score INTEGER DEFAULT 0,
    fraud_label fraud_label DEFAULT 'VALID',
    ml_fraud_score DECIMAL(5, 4),
    ml_prediction_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    admin_viewed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claim line items table
CREATE TABLE claim_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    procedure_code VARCHAR(20),
    procedure_desc TEXT,
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(12, 2),
    total_cost DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fraud flags table
CREATE TABLE fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,
    flag_reason TEXT,
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_members_member_number ON members(member_number);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_providers_facility_code ON providers(facility_code);
CREATE INDEX idx_claims_member_id ON claims(member_id);
CREATE INDEX idx_claims_provider_id ON claims(provider_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_fraud_label ON claims(fraud_label);
CREATE INDEX idx_claims_fraud_score ON claims(fraud_score);
CREATE INDEX idx_claims_created_at ON claims(created_at);
CREATE INDEX idx_claims_admin_viewed ON claims(admin_viewed);
CREATE INDEX idx_fraud_flags_claim_id ON fraud_flags(claim_id);

-- Function to generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.claim_number := 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(NEXTVAL('claim_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for claim numbers
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 1;

-- Trigger to auto-generate claim number
CREATE TRIGGER set_claim_number
    BEFORE INSERT ON claims
    FOR EACH ROW
    WHEN (NEW.claim_number IS NULL)
    EXECUTE FUNCTION generate_claim_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

COMMENT ON TABLE members IS 'SHA/NHIF members with insurance coverage';
COMMENT ON TABLE providers IS 'Healthcare facilities and providers';
COMMENT ON TABLE claims IS 'Healthcare claims with fraud detection scores';
COMMENT ON TABLE fraud_flags IS 'Fraud detection flags for flagged claims';
COMMENT ON COLUMN claims.ml_fraud_score IS 'XGBoost ML model fraud probability (0-1)';
COMMENT ON COLUMN claims.icd11_code IS 'ICD-11 diagnosis code for ML feature extraction';
