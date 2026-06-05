# Healthcare Claims Adjudication and Reimbursement System

This directory contains the backend implementation for a rule-based healthcare claims adjudication and reimbursement system.

## Files

1. `schema.sql` - PostgreSQL database schema creation script
2. `claims_processor.py` - Python implementation of the core logic including:
   - Validation engine (fraud detection rules)
   - Reimbursement engine
   - Wallet integration
   - Workflow orchestration

## Database Schema

The schema includes the following tables:
- `members`: Stores member (patient) information
- `hospitals`: Stores hospital/healthcare provider information
- `premiums`: Tracks member premium payments and status
- `wallets`: Holds member wallet balances for reimbursements
- `claims`: Stores submitted claims and adjudication results
- `wallet_transactions`: Records transaction history for member wallets

## Core Logic Features

### Validation Engine
Implements five fraud detection rules:
1. **Timing Rule**: Claim must be submitted within 90 days of service date
2. **Hospital Rule**: Hospital must be active and registered
3. **Member Rule**: Member must be active and have active premium
4. **Frequency Rule**: Member cannot exceed 5 claims per month
5. **Duplication Rule**: No duplicate claims (same member, hospital, service date, and amount) within 6 months
6. **Premium Status Check**: Member's premium payment must be active

### Reimbursement Engine
Calculates reimbursement amount using the formula:
```
max(0, ((claimed_amount - DEDUCTIBLE) * COVERAGE_PERCENTAGE) - CO_PAYMENT)
```
With global policy settings:
- Premium: KSh 5,000
- Deductible: KSh 20,000
- Coverage: 80%
- Co-payment: KSh 2,000

### Wallet Integration
Upon successful reimbursement:
- Updates member's wallet balance
- Appends a record to the transaction history

### Workflow Orchestration
Follows the claim processing flow:
1. Receive claim upload
2. Validate claim (run validation engine)
3. If validated, calculate reimbursement
4. Update claim status and approved amount
5. If approved, update wallet and record transaction
6. Return processing result

### Error Handling and Status Mapping
Maps outcomes to statuses:
- `APPROVED`: All validations passed
- `MANUAL REVIEW`: Specific conditions (e.g., premium payment issues)
- `REJECTED`: Any validation failure (fraud detection rules)

## Usage

See the example in `claims_processor.py` for how to use the `ClaimsProcessor` class.

## Requirements

- PostgreSQL database
- Python 3.x
- psycopg2-binary package

Install dependencies with:
```
pip install psycopg2-binary
```

## Setup

1. Run `schema.sql` against your PostgreSQL database to create the tables
2. Update the database connection parameters in `claims_processor.py` or pass them to the `ClaimsProcessor` constructor
3. Use the `process_claim` method to adjudicate claims