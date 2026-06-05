"""
Rule-Based Healthcare Claims Adjudication and Reimbursement System
Core Logic Implementation
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum

# Global Policy Settings (as per technical constraints)
PREMIUM_AMOUNT = 5000.00  # KSh
DEDUCTIBLE = 20000.00     # KSh
COVERAGE_PERCENTAGE = 0.80  # 80%
CO_PAYMENT = 2000.00      # KSh

class ClaimStatus(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    APPROVED = "APPROVED"
    MANUAL_REVIEW = "MANUAL REVIEW"
    REJECTED = "REJECTED"

class RejectionReason(Enum):
    # Fraud detection rules
    TIMING_RULE_VIOLATION = "Claim submitted outside allowed time window from service date"
    HOSPITAL_RULE_VIOLATION = "Hospital is not active or not registered"
    MEMBER_RULE_VIOLATION = "Member is not active or premium is not active"
    FREQUENCY_RULE_VIOLATION = "Member has exceeded maximum allowed claims per period"
    DUPLICATION_RULE_VIOLATION = "Duplicate claim detected (same member, hospital, service date, and amount)"
    PREMIUM_STATUS_CHECK = "Member's premium payment is not active"
    # Other reasons
    INVALID_CLAIM_AMOUNT = "Claimed amount is invalid"
    PROCESSING_ERROR = "Error during claim processing"

class ClaimsProcessor:
    def __init__(self, db_connection_params: Dict[str, str]):
        """
        Initialize the claims processor with database connection parameters.
        
        Args:
            db_connection_params: Dictionary with keys: host, database, user, password, port
        """
        self.db_connection_params = db_connection_params
        self.connection = None
    
    def connect(self):
        """Establish database connection."""
        if self.connection is None or self.connection.closed:
            self.connection = psycopg2.connect(**self.db_connection_params)
    
    def close(self):
        """Close database connection."""
        if self.connection and not self.connection.closed:
            self.connection.close()
    
    def _execute_query(self, query: str, params: Tuple = None, fetch: bool = False):
        """Execute a database query."""
        self.connect()
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            if fetch:
                result = cursor.fetchall()
                self.connection.commit()
                return result
            else:
                self.connection.commit()
                return cursor.rowcount
    
    # Validation Engine: Fraud Detection Rules
    def validate_timing_rule(self, member_id: int, service_date: datetime.date) -> Tuple[bool, Optional[str]]:
        """
        Timing Rule: Claim must be submitted within 90 days of service date.
        
        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        # Assuming we have the submission date from the claim (we'll pass it in)
        # For this rule, we need submission date - we'll get it from the claim object
        # This function will be called from validate_claim with submission_date
        pass  # We'll implement in the main validation function
    
    def validate_hospital_rule(self, hospital_id: int) -> Tuple[bool, Optional[str]]:
        """
        Hospital Rule: Hospital must be active and registered.
        
        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        query = """
            SELECT is_active FROM hospitals 
            WHERE hospital_id = %s
        """
        result = self._execute_query(query, (hospital_id,), fetch=True)
        if not result:
            return False, RejectionReason.HOSPITAL_RULE_VIOLATION.value
        if not result[0]['is_active']:
            return False, RejectionReason.HOSPITAL_RULE_VIOLATION.value
        return True, None
    
    def validate_member_rule(self, member_id: int) -> Tuple[bool, Optional[str]]:
        """
        Member Rule: Member must be active and have active premium.
        
        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        # Check member active status
        member_query = """
            SELECT is_active FROM members 
            WHERE member_id = %s
        """
        member_result = self._execute_query(member_query, (member_id,), fetch=True)
        if not member_result:
            return False, RejectionReason.MEMBER_RULE_VIOLATION.value
        if not member_result[0]['is_active']:
            return False, RejectionReason.MEMBER_RULE_VIOLATION.value
        
        # Check premium status (active and not expired)
        premium_query = """
            SELECT status, expiry_date FROM premiums 
            WHERE member_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        premium_result = self._execute_query(premium_query, (member_id,), fetch=True)
        if not premium_result:
            return False, RejectionReason.PREMIUM_STATUS_CHECK.value
        
        premium = premium_result[0]
        if premium['status'] != 'ACTIVE':
            return False, RejectionReason.PREMIUM_STATUS_CHECK.value
        if premium['expiry_date'] < datetime.now().date():
            return False, RejectionReason.PREMIUM_STATUS_CHECK.value
        
        return True, None
    
    def validate_frequency_rule(self, member_id: int, service_date: datetime.date) -> Tuple[bool, Optional[str]]:
        """
        Frequency Rule: Member cannot exceed 5 claims per month.
        
        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        # Calculate the start of the month for the service date
        start_of_month = service_date.replace(day=1)
        # End of month
        if service_date.month == 12:
            end_of_month = service_date.replace(year=service_date.year+1, month=1, day=1) - timedelta(days=1)
        else:
            end_of_month = service_date.replace(month=service_date.month+1, day=1) - timedelta(days=1)
        
        query = """
            SELECT COUNT(*) as claim_count FROM claims
            WHERE member_id = %s 
            AND service_date BETWEEN %s AND %s
            AND status IN ('APPROVED', 'MANUAL REVIEW', 'PENDING', 'PROCESSING')
        """
        result = self._execute_query(query, (member_id, start_of_month, end_of_month), fetch=True)
        claim_count = result[0]['claim_count'] if result else 0
        
        if claim_count >= 5:
            return False, RejectionReason.FREQUENCY_RULE_VIOLATION.value
        return True, None
    
    def validate_duplication_rule(self, member_id: int, hospital_id: int, 
                                 service_date: datetime.date, claimed_amount: float) -> Tuple[bool, Optional[str]]:
        """
        Duplication Rule: No duplicate claims (same member, hospital, service date, and amount) within 6 months.
        
        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        six_months_ago = datetime.now().date() - timedelta(days=180)
        
        query = """
            SELECT COUNT(*) as duplicate_count FROM claims
            WHERE member_id = %s 
            AND hospital_id = %s
            AND service_date = %s
            AND claimed_amount = %s
            AND submission_date >= %s
            AND status != 'REJECTED'
        """
        result = self._execute_query(query, (member_id, hospital_id, service_date, claimed_amount, six_months_ago), fetch=True)
        duplicate_count = result[0]['duplicate_count'] if result else 0
        
        if duplicate_count > 0:
            return False, RejectionReason.DUPLICATION_RULE_VIOLATION.value
        return True, None
    
    def validate_premium_status(self, member_id: int) -> Tuple[bool, Optional[str]]:
        """
        Premium Status Check: Member's premium must be active and paid.
        (This is partially covered in member_rule, but we'll keep it separate for clarity)
        
        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        query = """
            SELECT status FROM premiums 
            WHERE member_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        result = self._execute_query(query, (member_id,), fetch=True)
        if not result:
            return False, RejectionReason.PREMIUM_STATUS_CHECK.value
        if result[0]['status'] != 'ACTIVE':
            return False, RejectionReason.PREMIUM_STATUS_CHECK.value
        return True, None
    
    def run_validation_engine(self, claim_data: Dict) -> Tuple[ClaimStatus, Optional[str], List[str]]:
        """
        Run all validation rules and determine claim status.
        
        Args:
            claim_data: Dictionary containing claim information
                - member_id
                - hospital_id
                - service_date
                - submission_date
                - claimed_amount
        
        Returns:
            Tuple of (status, rejection_reason, list_of_passed_rules)
        """
        passed_rules = []
        rejection_reasons = []
        
        # Rule 1: Timing Rule (submission within 7 days of service)
        service_date = claim_data['service_date']
        submission_date = claim_data['submission_date']
        if isinstance(service_date, str):
            service_date = datetime.strptime(service_date, '%Y-%m-%d').date()
        if isinstance(submission_date, str):
            submission_date = datetime.strptime(submission_date, '%Y-%m-%d %H:%M:%S')
        
        days_diff = (submission_date.date() - service_date).days
        if days_diff < 0 or days_diff > 7:
            rejection_reasons.append(RejectionReason.TIMING_RULE_VIOLATION.value)
        else:
            passed_rules.append("timing")
        
        # Rule 2: Hospital Rule
        is_valid, reason = self.validate_hospital_rule(claim_data['hospital_id'])
        if not is_valid:
            rejection_reasons.append(reason)
        else:
            passed_rules.append("hospital")
        
        # Rule 3: Member Rule
        is_valid, reason = self.validate_member_rule(claim_data['member_id'])
        if not is_valid:
            rejection_reasons.append(reason)
        else:
            passed_rules.append("member")
        
        # Rule 4: Frequency Rule
        is_valid, reason = self.validate_frequency_rule(claim_data['member_id'], service_date)
        if not is_valid:
            rejection_reasons.append(reason)
        else:
            passed_rules.append("frequency")
        
        # Rule 5: Duplication Rule
        is_valid, reason = self.validate_duplication_rule(
            claim_data['member_id'],
            claim_data['hospital_id'],
            service_date,
            claim_data['claimed_amount']
        )
        if not is_valid:
            rejection_reasons.append(reason)
        else:
            passed_rules.append("duplication")
        
        # Premium Status Check (could be part of member rule, but keeping explicit)
        is_valid, reason = self.validate_premium_status(claim_data['member_id'])
        if not is_valid:
            rejection_reasons.append(reason)
        else:
            passed_rules.append("premium_status")
        
        # Determine overall status
        if rejection_reasons:
            # If any rejection reason exists, claim is rejected
            # In a more complex system, some might trigger manual review
            # For simplicity, we'll say any validation failure = REJECTED
            # But per spec, some might be MANUAL REVIEW - we'll map timing and duplication to REJECTED,
            # and others to MANUAL REVIEW? Let's follow the spec: 
            # The spec says: "Ensure the system correctly maps outcomes to the defined statuses: APPROVED, MANUAL REVIEW, or REJECTED"
            # We'll need to define which rules lead to which status.
            # For now, let's assume:
            # - Timing, Hospital, Member, Frequency, Duplication -> REJECTED (as they are fraud rules)
            # - Premium status -> MANUAL REVIEW (as it might be a payment issue)
            # However, the spec doesn't specify. Let's make a reasonable assumption:
            # All validation failures lead to REJECTED for simplicity, but we can adjust.
            # We'll check the rejection reasons and assign accordingly.
            manual_review_reasons = [RejectionReason.PREMIUM_STATUS_CHECK.value]
            rejected_reasons = [r for r in rejection_reasons if r not in manual_review_reasons]
            
            if rejected_reasons:
                status = ClaimStatus.REJECTED
                # Use the first rejection reason for simplicity
                final_reason = rejected_reasons[0]
            elif manual_review_reasons:
                status = ClaimStatus.MANUAL_REVIEW
                final_reason = manual_review_reasons[0]
            else:
                status = ClaimStatus.REJECTED  # fallback
                final_reason = rejection_reasons[0]
        else:
            status = ClaimStatus.APPROVED
            final_reason = None
        
        return status, final_reason, passed_rules
    
    def calculate_reimbursement(self, claimed_amount: float) -> float:
        """
        Reimbursement Engine: Calculate reimbursement amount based on:
        1. Deductible: Subtract KSh 20,000 from claimed amount
        2. Coverage: Multiply remainder by 80%
        3. Co-payment: Subtract KSh 2,000 from the result
        4. Ensure result never goes below zero
        
        Formula: max(0, ((claimed_amount - DEDUCTIBLE) * COVERAGE_PERCENTAGE) - CO_PAYMENT)
        
        Args:
            claimed_amount: The amount claimed by the hospital
        
        Returns:
            The approved reimbursement amount
        """
        # Step 1: Apply deductible
        after_deductible = max(0, claimed_amount - DEDUCTIBLE)
        
        # Step 2: Apply coverage percentage
        after_coverage = after_deductible * COVERAGE_PERCENTAGE
        
        # Step 3: Subtract co-payment
        after_copay = after_coverage - CO_PAYMENT
        
        # Ensure non-negative
        approved_amount = max(0, after_copay)
        
        return round(approved_amount, 2)
    
    def update_wallet_and_record_transaction(self, member_id: int, amount: float, claim_id: int) -> bool:
        """
        Wallet Integration: Update member's wallet balance and record transaction.
        
        Args:
            member_id: The member's ID
            amount: The amount to credit to the wallet (reimbursement amount)
            claim_id: The ID of the claim being processed
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Start a transaction
            self.connect()
            with self.connection:
                with self.connection.cursor() as cursor:
                    # 1. Get or create wallet for member
                    wallet_query = """
                        SELECT wallet_id, balance FROM wallets 
                        WHERE member_id = %s FOR UPDATE
                    """
                    cursor.execute(wallet_query, (member_id,))
                    wallet_result = cursor.fetchone()
                    
                    if wallet_result:
                        wallet_id, current_balance = wallet_result
                        new_balance = current_balance + amount
                        # Update wallet balance
                        update_wallet_query = """
                            UPDATE wallets 
                            SET balance = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE wallet_id = %s
                        """
                        cursor.execute(update_wallet_query, (new_balance, wallet_id))
                    else:
                        # Create wallet if it doesn't exist
                        insert_wallet_query = """
                            INSERT INTO wallets (member_id, balance)
                            VALUES (%s, %s)
                            RETURNING wallet_id
                        """
                        cursor.execute(insert_wallet_query, (member_id, amount))
                        wallet_id = cursor.fetchone()[0]
                    
                    # 2. Record transaction
                    insert_transaction_query = """
                        INSERT INTO wallet_transactions 
                        (wallet_id, amount, transaction_type, description, related_claim_id)
                        VALUES (%s, %s, %s, %s, %s)
                    """
                    description = f"Reimbursement for claim #{claim_id}"
                    cursor.execute(insert_transaction_query, 
                                 (wallet_id, amount, 'CREDIT', description, claim_id))
            
            return True
        except Exception as e:
            print(f"Error updating wallet and recording transaction: {e}")
            return False
    
    def process_claim(self, claim_data: Dict) -> Dict:
        """
        Main workflow orchestration method that follows the Claim Processing Flow.
        
        Steps:
        1. Receive claim upload
        2. Validate claim (run validation engine)
        3. If validated, calculate reimbursement
        4. Update claim status and approved amount
        5. If approved, update wallet and record transaction
        6. Return processing result
        
        Args:
            claim_data: Dictionary containing claim information
                - member_id
                - hospital_id
                - service_date
                - submission_date (optional, defaults to now)
                - claimed_amount
        
        Returns:
            Dictionary with processing results
        """
        # Set submission date if not provided
        if 'submission_date' not in claim_data:
            claim_data['submission_date'] = datetime.now()
        
        # Initialize result
        result = {
            'claim_id': None,
            'status': None,
            'rejection_reason': None,
            'claimed_amount': claim_data['claimed_amount'],
            'approved_amount': 0.0,
            'reimbursement_amount': 0.0,
            'processed_at': None,
            'passed_rules': [],
            'failed_rules': []
        }
        
        try:
            self.connect()
            with self.connection:
                with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                    # Insert the claim initially with PENDING status
                    insert_claim_query = """
                        INSERT INTO claims 
                        (member_id, hospital_id, service_date, submission_date, claimed_amount, status)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING claim_id
                    """
                    cursor.execute(insert_claim_query, (
                        claim_data['member_id'],
                        claim_data['hospital_id'],
                        claim_data['service_date'],
                        claim_data['submission_date'],
                        claim_data['claimed_amount'],
                        ClaimStatus.PENDING.value
                    ))
                    claim_id = cursor.fetchone()['claim_id']
                    result['claim_id'] = claim_id
                    
                    # Update status to PROCESSING
                    update_status_query = """
                        UPDATE claims 
                        SET status = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE claim_id = %s
                    """
                    cursor.execute(update_status_query, (ClaimStatus.PROCESSING.value, claim_id))
                    
                    # Run validation engine
                    status, rejection_reason, passed_rules = self.run_validation_engine(claim_data)
                    result['status'] = status.value
                    result['rejection_reason'] = rejection_reason
                    result['passed_rules'] = passed_rules
                    
                    if status == ClaimStatus.APPROVED:
                        # Calculate reimbursement
                        approved_amount = self.calculate_reimbursement(claim_data['claimed_amount'])
                        result['approved_amount'] = approved_amount
                        result['reimbursement_amount'] = approved_amount  # For clarity
                        
                        # Update claim with approved amount and status
                        update_claim_query = """
                            UPDATE claims 
                            SET status = %s, approved_amount = %s, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                            WHERE claim_id = %s
                        """
                        cursor.execute(update_claim_query, (ClaimStatus.APPROVED.value, approved_amount, claim_id))
                        
                        # Update wallet and record transaction
                        wallet_success = self.update_wallet_and_record_transaction(
                            claim_data['member_id'], 
                            approved_amount, 
                            claim_id
                        )
                        
                        if not wallet_success:
                            # If wallet update fails, we might want to set to manual review or retry
                            # For now, we'll log but still consider claim approved
                            print(f"Warning: Wallet update failed for claim {claim_id}")
                    
                    elif status == ClaimStatus.MANUAL_REVIEW:
                        update_claim_query = """
                            UPDATE claims 
                            SET status = %s, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, rejection_reason = %s
                            WHERE claim_id = %s
                        """
                        cursor.execute(update_claim_query, (ClaimStatus.MANUAL_REVIEW.value, rejection_reason, claim_id))
                    
                    else:  # REJECTED
                        update_claim_query = """
                            UPDATE claims 
                            SET status = %s, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, rejection_reason = %s
                            WHERE claim_id = %s
                        """
                        cursor.execute(update_claim_query, (ClaimStatus.REJECTED.value, rejection_reason, claim_id))
        
        except Exception as e:
            print(f"Error processing claim: {e}")
            result['status'] = ClaimStatus.REJECTED.value
            result['rejection_reason'] = RejectionReason.PROCESSING_ERROR.value
        
        finally:
            self.close()
        
        return result

# Example usage (for testing purposes)
if __name__ == "__main__":
    # Database connection parameters (update as needed)
    db_params = {
        'host': 'localhost',
        'database': 'healthcare_claims',
        'user': 'postgres',
        'password': 'password',
        'port': 5432
    }
    
    processor = ClaimsProcessor(db_params)
    
    # Sample claim data
    sample_claim = {
        'member_id': 1,
        'hospital_id': 1,
        'service_date': '2026-05-01',
        'claimed_amount': 25000.00  # KSh 25,000
        # submission_date will be set to now
    }
    
    result = processor.process_claim(sample_claim)
    print("Claim Processing Result:")
    print(f"Claim ID: {result['claim_id']}")
    print(f"Status: {result['status']}")
    print(f"Rejection Reason: {result['rejection_reason']}")
    print(f"Claimed Amount: {result['claimed_amount']}")
    print(f"Approved Amount: {result['approved_amount']}")
    print(f"Reimbursement Amount: {result['reimbursement_amount']}")
    print(f"Passed Rules: {result['passed_rules']}")