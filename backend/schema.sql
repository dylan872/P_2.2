-- Claims Guard Database Schema
-- Aligned with existing database + additions from backend/schema.sql
-- Run this against your existing database to add missing features

-- ============================================
-- ENUM TYPES (already in your DB, kept here for reference)
-- ============================================

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE insurer_type AS ENUM ('SHA', 'NHIF', 'PRIVATE', 'CORPORATE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE cover_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'analyst');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'DENTAL', 'OPTICAL', 'MATERNITY', 'SURGICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE claim_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'FLAGGED', 'APPROVED', 'REJECTED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE fraud_label AS ENUM ('VALID', 'SUSPICIOUS', 'FRAUDULENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE flag_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE premium_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE wallet_transaction_type_enum AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    member_number VARCHAR(20) NOT NULL UNIQUE,
    national_id VARCHAR(20) UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender gender_type,
    phone_number VARCHAR(20),
    address TEXT,
    insurer_type insurer_type DEFAULT 'SHA'::insurer_type,
    policy_number VARCHAR(30),
    cover_status cover_status DEFAULT 'ACTIVE'::cover_status,
    cover_expiry DATE,
    role user_role DEFAULT 'user'::user_role,
    is_active BOOLEAN DEFAULT TRUE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROVIDERS / HOSPITALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    facility_code VARCHAR(20) NOT NULL UNIQUE,
    facility_name VARCHAR(150) NOT NULL,
    facility_type VARCHAR(50),
    county VARCHAR(50),
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    phone_number VARCHAR(20),
    email VARCHAR(100),
    accreditation_status VARCHAR(50),
    license_number VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CLAIMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(30) NOT NULL UNIQUE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    hospital_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    service_date DATE NOT NULL,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis_code VARCHAR(20),
    diagnosis_desc VARCHAR(255),
    service_type service_type DEFAULT 'OUTPATIENT'::service_type,
    total_billed NUMERIC(15,2) NOT NULL,
    claimed_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    approved_amount NUMERIC(15,2),
    status claim_status DEFAULT 'PENDING'::claim_status,
    fraud_score INTEGER DEFAULT 0,
    fraud_label fraud_label DEFAULT 'VALID'::fraud_label,
    notes TEXT,
    rejection_reason TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CLAIM LINE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS claim_line_items (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    procedure_code VARCHAR(20),
    procedure_desc VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_cost NUMERIC(12,2),
    total_cost NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FRAUD FLAGS
-- ============================================

CREATE TABLE IF NOT EXISTS fraud_flags (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,
    flag_reason VARCHAR(255),
    severity flag_severity DEFAULT 'MEDIUM'::flag_severity,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CLAIM SUPPORTING DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS claim_supporting_documents (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(100),
    description TEXT,
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PREMIUMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS premiums (
    premium_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    status premium_status_enum NOT NULL DEFAULT 'PENDING'::premium_status_enum,
    payment_date TIMESTAMP,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WALLETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id SERIAL PRIMARY KEY,
    member_id INTEGER UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WALLET TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    transaction_id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type wallet_transaction_type_enum NOT NULL,
    description TEXT,
    related_claim_id INTEGER REFERENCES claims(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_member_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_national_id ON members(national_id);
CREATE INDEX IF NOT EXISTS idx_member_cover_status ON members(cover_status);

CREATE INDEX IF NOT EXISTS idx_facility_code ON providers(facility_code);
CREATE INDEX IF NOT EXISTS idx_facility_name ON providers(facility_name);

CREATE INDEX IF NOT EXISTS idx_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claim_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_fraud_label ON claims(fraud_label);
CREATE INDEX IF NOT EXISTS idx_fraud_score ON claims(fraud_score);
CREATE INDEX IF NOT EXISTS idx_member_id ON claims(member_id);
CREATE INDEX IF NOT EXISTS idx_provider_id ON claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_date ON claims(service_date);

CREATE INDEX IF NOT EXISTS idx_claim_line_items_claim_id ON claim_line_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_claim_id ON fraud_flags(claim_id);
CREATE INDEX IF NOT EXISTS idx_notifications_claim_id ON notifications(claim_id);
CREATE INDEX IF NOT EXISTS idx_notifications_viewed ON notifications(viewed);
CREATE INDEX IF NOT EXISTS idx_supporting_docs_claim_id ON claim_supporting_documents(claim_id);

CREATE INDEX IF NOT EXISTS idx_premiums_member_id ON premiums(member_id);
CREATE INDEX IF NOT EXISTS idx_premiums_status ON premiums(status);
CREATE INDEX IF NOT EXISTS idx_premiums_expiry_date ON premiums(expiry_date);
CREATE INDEX IF NOT EXISTS idx_wallets_member_id ON wallets(member_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_claim_id ON wallet_transactions(related_claim_id);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_processed_at_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('APPROVED', 'REJECTED', 'CLOSED') AND NEW.processed_at IS NULL THEN
        NEW.processed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS members_update_at ON members;
CREATE TRIGGER members_update_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS providers_update_at ON providers;
CREATE TRIGGER providers_update_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS claims_update_at ON claims;
CREATE TRIGGER claims_update_at BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS premiums_update_at ON premiums;
CREATE TRIGGER premiums_update_at BEFORE UPDATE ON premiums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS wallets_update_at ON wallets;
CREATE TRIGGER wallets_update_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS claims_status_change ON claims;
CREATE TRIGGER claims_status_change BEFORE UPDATE ON claims
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_processed_at_on_status_change();

-- ============================================
-- SEED DATA
-- ============================================

-- Premiums seed (FIXED: explicit cast to premium_status_enum)
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..100 LOOP
        INSERT INTO premiums (member_id, amount, status, payment_date, expiry_date)
        VALUES (
            i,
            5000.00,
            (CASE WHEN i % 10 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END)::premium_status_enum,
            CURRENT_TIMESTAMP - (i || ' days')::INTERVAL,
            CURRENT_DATE + (365 - (i % 120)) * INTERVAL '1 day'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Wallets seed: one wallet per member (default balance 0)
INSERT INTO wallets (member_id, balance)
SELECT id, 0.00 FROM members WHERE id NOT IN (SELECT member_id FROM wallets)
ON CONFLICT DO NOTHING;

-- Override balances for first 10 members
INSERT INTO wallets (member_id, balance) VALUES
    (1, 15000.00), (2, 22500.00), (3, 18000.00), (4, 31000.00), (5, 12000.00),
    (6, 28000.00), (7, 19500.00), (8, 35000.00), (9, 14000.00), (10, 26000.00)
ON CONFLICT (member_id) DO UPDATE SET balance = EXCLUDED.balance;

-- Wallet transactions seed: reimbursements for approved claims
INSERT INTO wallet_transactions (wallet_id, amount, transaction_type, description, related_claim_id)
SELECT
    w.wallet_id,
    c.total_billed * 0.8,
    'CREDIT'::wallet_transaction_type_enum,
    'Reimbursement for claim ' || c.claim_number,
    c.id
FROM claims c
JOIN members m ON c.member_id = m.id
JOIN wallets w ON w.member_id = m.id
WHERE c.status = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM wallet_transactions wt
      WHERE wt.related_claim_id = c.id
  )
LIMIT 20;

-- Supporting documents seed
INSERT INTO claim_supporting_documents (claim_id, file_name, file_path, file_size, content_type, description, uploaded_by)
VALUES
    (81, 'claim_81_support_1.pdf',   '/supporting-docs/81/1717891200000-claim_81_support_1.pdf',  245000,  'application/pdf', 'Original admission notes', 'admin'),
    (82, 'claim_82_lab_results.pdf', '/supporting-docs/82/1717891200001-claim_82_lab_results.pdf', 189000,  'application/pdf', 'Lab results and X-ray',    'admin'),
    (83, 'claim_82_xray.jpg',        '/supporting-docs/82/1717891200002-claim_82_xray.jpg',        3200000, 'image/jpeg',      'X-ray image',               'admin'),
    (84, 'claim_84_discharge.pdf',   '/supporting-docs/84/1717891200003-claim_84_discharge.pdf',   156000,  'application/pdf', 'Discharge summary',         'admin'),
    (85, 'claim_85_prescription.pdf','/supporting-docs/85/1717891200004-claim_85_prescription.pdf', 98000,  'application/pdf', 'Doctor prescription',       'admin'),
    (86, 'claim_86_invoice.pdf',     '/supporting-docs/86/1717891200005-claim_86_invoice.pdf',     210000,  'application/pdf', 'Hospital invoice',          'admin'),
    (87, 'claim_87_report.pdf',      '/supporting-docs/87/1717891200006-claim_87_report.pdf',      175000,  'application/pdf', 'Medical report',            'admin'),
    (88, 'claim_88_scan.jpg',        '/supporting-docs/88/1717891200007-claim_88_scan.jpg',        4100000, 'image/jpeg',      'CT scan image',             'admin'),
    (89, 'claim_89_notes.pdf',       '/supporting-docs/89/1717891200008-claim_89_notes.pdf',       134000,  'application/pdf', 'Clinical notes',            'admin'),
    (90, 'claim_90_form.pdf',        '/supporting-docs/90/1717891200009-claim_90_form.pdf',        198000,  'application/pdf', 'Claim form',                'admin')
ON CONFLICT DO NOTHING;