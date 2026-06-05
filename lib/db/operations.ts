import { query, pool, PaginationParams, PaginatedResult } from "./postgres-client"

export { query }

// ============================================
// MEMBER OPERATIONS
// ============================================

export interface Member {
  id: string
  member_number: string
  national_id: string
  full_name: string
  date_of_birth: string
  gender: string
  phone_number: string
  address: string
  insurer_type: string
  policy_number: string
  cover_status: string
  cover_expiry: string
  role: string
  created_at: string
}

export async function getMemberByCredentials(
  memberNumber: string,
  nationalId: string
): Promise<Member | null> {
  const result = await query<Member>(
    `SELECT * FROM members WHERE member_number = $1 AND national_id = $2`,
    [memberNumber, nationalId]
  )
  return result.rows[0] || null
}

// export async function getMemberById(id: string): Promise<Member | null> {
//   const result = await query<Member>(`'SELECT * FROM members WHERE member_number = $1',`, [id])
//   return result.rows[0] || null
// }
export async function getMemberById(id: string): Promise<Member | null> {
  const result = await query<Member>(`SELECT * FROM members WHERE id = $1`, [id])
  return result.rows[0] || null
}

export async function getMemberByMemberNumber(memberNumber: string): Promise<Member | null> {
  const result = await query<Member>(`SELECT * FROM members WHERE member_number = $1`, [memberNumber])
  return result.rows[0] || null
}

export async function getMembers(
  pagination: PaginationParams = {}
): Promise<PaginatedResult<Member>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 20
  const offset = (page - 1) * limit

  const countResult = await query<{ count: string }>(`SELECT COUNT(*) FROM members`)
  const total = parseInt(countResult.rows[0].count)

  const result = await query<Member>(
    `SELECT * FROM members ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getMembersWithHighFraud(
  pagination: PaginationParams = {}
): Promise<PaginatedResult<Member & { fraud_count: number; avg_fraud_score: number }>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 20
  const offset = (page - 1) * limit

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT m.id) FROM members m 
     JOIN claims c ON c.member_id = m.id 
     WHERE c.fraud_score > 50`
  )
  const total = parseInt(countResult.rows[0].count)

  const result = await query<Member & { fraud_count: number; avg_fraud_score: number }>(
    `SELECT m.*, 
            COUNT(c.id) as fraud_count, 
            ROUND(AVG(c.fraud_score)::numeric, 2) as avg_fraud_score
     FROM members m
     JOIN claims c ON c.member_id = m.id
     WHERE c.fraud_score > 50
     GROUP BY m.id
     ORDER BY avg_fraud_score DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return {
    data: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// ============================================
// PROVIDER OPERATIONS
// ============================================

export interface Provider {
  id: string
  facility_code: string
  facility_name: string
  facility_type: string
  county: string
  sub_county: string
  phone_number: string
  email: string
  is_accredited: boolean
  created_at: string
}

export async function getProviderById(id: string): Promise<Provider | null> {
  const result = await query<Provider>(`SELECT * FROM providers WHERE id = $1`, [id])
  return result.rows[0] || null
}

export async function getProviderByCode(facilityCode: string): Promise<Provider | null> {
  const result = await query<Provider>(
    `SELECT * FROM providers WHERE facility_code = $1`,
    [facilityCode]
  )
  return result.rows[0] || null
}

export async function getProviders(
  pagination: PaginationParams = {}
): Promise<PaginatedResult<Provider>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 20
  const offset = (page - 1) * limit

  const countResult = await query<{ count: string }>(`SELECT COUNT(*) FROM providers`)
  const total = parseInt(countResult.rows[0].count)

  const result = await query<Provider>(
    `SELECT * FROM providers ORDER BY facility_name LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return {
    data: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getProvidersWithFraudStats(
  pagination: PaginationParams = {}
): Promise<PaginatedResult<Provider & { total_claims: number; fraud_rate: number; avg_fraud_score: number }>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 20
  const offset = (page - 1) * limit

  const countResult = await query<{ count: string }>(`SELECT COUNT(*) FROM providers`)
  const total = parseInt(countResult.rows[0].count)

  const result = await query<Provider & { total_claims: number; fraud_rate: number; avg_fraud_score: number }>(
    `SELECT p.*,
            COUNT(c.id) as total_claims,
            ROUND(100.0 * COUNT(CASE WHEN c.fraud_label = 'FRAUDULENT' THEN 1 END) / NULLIF(COUNT(c.id), 0), 2) as fraud_rate,
            ROUND(AVG(c.fraud_score)::numeric, 2) as avg_fraud_score
     FROM providers p
     LEFT JOIN claims c ON c.provider_id = p.id
     GROUP BY p.id
     ORDER BY avg_fraud_score DESC NULLS LAST
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return {
    data: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// ============================================
// CLAIM OPERATIONS
// ============================================

export interface Claim {
  id: string
  claim_number: string
  member_id: string
  provider_id: string
  service_date: string
  diagnosis_code: string
  diagnosis_desc: string
  service_type: string
  total_billed: number
  approved_amount: number | null
  status: string
  fraud_score: number
  fraud_label: string
  notes: string
  viewed_by_admin: boolean
  created_at: string
  updated_at: string
  submission_date: string
}

export interface ClaimWithDetails extends Claim {
  member_name: string
  member_number: string
  facility_name: string
  facility_code: string
}

export async function createClaim(claimData: {
  claim_number?: string
  member_id: string
  provider_id: string
  service_date: string
  diagnosis_code: string
  diagnosis_desc: string
  service_type: string
  total_billed: number
  notes?: string
  status?: string
  fraud_score?: number
  fraud_label?: string
}): Promise<Claim> {
  const result = await query<Claim>(
    `INSERT INTO claims (
      claim_number, member_id, provider_id, service_date, diagnosis_code, diagnosis_desc,
      service_type, total_billed, notes, status, fraud_score,
      fraud_label
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      claimData.claim_number || null,
      claimData.member_id,
      claimData.provider_id,
      claimData.service_date,
      claimData.diagnosis_code,
      claimData.diagnosis_desc,
      claimData.service_type,
      claimData.total_billed,
      claimData.notes || null,
      claimData.status ||
        (claimData.fraud_label === "FRAUDULENT" ? "FLAGGED" : 
        claimData.fraud_label === "SUSPICIOUS" ? "UNDER_REVIEW" : "PENDING"),
      claimData.fraud_score || 0,
      claimData.fraud_label || "VALID",
    ]
  )
  return result.rows[0]
}

export async function updateClaimFraudScore(
  claimId: string,
  fraudScore: number,
  fraudLabel: string
): Promise<Claim | null> {
  const result = await query<Claim>(
    `UPDATE claims SET 
      fraud_score = $2, 
      fraud_label = $3,
      status = CASE 
        WHEN $3 = 'FRAUDULENT' THEN 'FLAGGED'
        WHEN $3 = 'SUSPICIOUS' THEN 'UNDER_REVIEW'
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = $1 RETURNING *`,
    [claimId, fraudScore, fraudLabel]
  )
  return result.rows[0] || null
}

export async function getClaims(
  pagination: PaginationParams = {},
  filters?: { status?: string; fraud_label?: string; member_id?: string }
): Promise<PaginatedResult<ClaimWithDetails>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 20
  const offset = (page - 1) * limit

  let whereClause = "WHERE 1=1"
  const params: unknown[] = []
  let paramIndex = 1

  if (filters?.status) {
    whereClause += ` AND c.status = $${paramIndex++}`
    params.push(filters.status)
  }
  if (filters?.fraud_label) {
    whereClause += ` AND c.fraud_label = $${paramIndex++}`
    params.push(filters.fraud_label)
  }
  if (filters?.member_id) {
    whereClause += ` AND c.member_id = $${paramIndex++}`
    params.push(filters.member_id)
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM claims c ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count)

  const result = await query<ClaimWithDetails>(
    `SELECT c.*, 
            m.full_name as member_name, 
            m.member_number,
            p.facility_name, 
            p.facility_code
     FROM claims c
     JOIN members m ON c.member_id = m.id
     JOIN providers p ON c.provider_id = p.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  )

  return {
    data: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getFraudulentClaims(
  pagination: PaginationParams = {}
): Promise<PaginatedResult<ClaimWithDetails>> {
  return getClaims(pagination, { fraud_label: "FRAUDULENT" })
}

export async function getClaimById(id: string): Promise<ClaimWithDetails | null> {
  const result = await query<ClaimWithDetails>(
    `SELECT c.*, 
            m.full_name as member_name, 
            m.member_number,
            p.facility_name, 
            p.facility_code
     FROM claims c
     JOIN members m ON c.member_id = m.id
     JOIN providers p ON c.provider_id = p.id
     WHERE c.id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function updateClaimStatus(
  claimId: string,
  status: string,
  approvedAmount?: number,
  fraudScore?: number,
  fraudLabel?: string
): Promise<Claim | null> {
  const result = await query<Claim>(
    `UPDATE claims SET 
      status = $2, 
      approved_amount = COALESCE($3, approved_amount),
      fraud_score = COALESCE($4, fraud_score),
      fraud_label = COALESCE($5, fraud_label),
      updated_at = NOW()
    WHERE id = $1 RETURNING *`,
    [claimId, status, approvedAmount || null, fraudScore ?? null, fraudLabel ?? null]
  )
  return result.rows[0] || null
}

export async function markClaimAsViewed(claimId: string): Promise<void> {
  await query(`UPDATE claims SET viewed_by_admin = true WHERE id = $1`, [claimId])
}

export async function getUnviewedClaims(): Promise<ClaimWithDetails[]> {
  const result = await query<ClaimWithDetails>(
    `SELECT c.*, 
            m.full_name as member_name, 
            m.member_number,
            p.facility_name, 
            p.facility_code
     FROM claims c
     JOIN members m ON c.member_id = m.id
     JOIN providers p ON c.provider_id = p.id
     WHERE c.viewed_by_admin = false
     ORDER BY c.created_at DESC
     LIMIT 50`
  )
  return result.rows
}

export async function markAllClaimsAsViewed(): Promise<void> {
  await query(`UPDATE claims SET viewed_by_admin = true WHERE viewed_by_admin = false`)
}

// ============================================
// FRAUD FLAGS OPERATIONS
// ============================================

export interface FraudFlag {
  id: string
  claim_id: string
  flag_type: string
  flag_reason: string
  severity: string
  created_at: string
}

export async function createFraudFlag(flagData: {
  claim_id: string
  flag_type: string
  flag_reason: string
  severity: string
}): Promise<FraudFlag> {
  const result = await query<FraudFlag>(
    `INSERT INTO fraud_flags (claim_id, flag_type, flag_reason, severity)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [flagData.claim_id, flagData.flag_type, flagData.flag_reason, flagData.severity]
  )
  return result.rows[0]
}

export async function getFraudFlagsByClaimId(claimId: string): Promise<FraudFlag[]> {
  const result = await query<FraudFlag>(
    `SELECT * FROM fraud_flags WHERE claim_id = $1 ORDER BY created_at DESC`,
    [claimId]
  )
  return result.rows
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

export interface DashboardStats {
  totalClaims: number
  validClaims: number
  suspiciousClaims: number
  fraudulentClaims: number
  totalBilled: number
  flaggedAmount: number
  avgFraudScore: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await query<{
    total_claims: string
    valid_claims: string
    suspicious_claims: string
    fraudulent_claims: string
    total_billed: string
    flagged_amount: string
    avg_fraud_score: string
  }>(
    `SELECT 
      COUNT(*) as total_claims,
      COUNT(CASE WHEN fraud_label = 'VALID' THEN 1 END) as valid_claims,
      COUNT(CASE WHEN fraud_label = 'SUSPICIOUS' THEN 1 END) as suspicious_claims,
      COUNT(CASE WHEN fraud_label = 'FRAUDULENT' THEN 1 END) as fraudulent_claims,
      COALESCE(SUM(total_billed), 0) as total_billed,
      COALESCE(SUM(CASE WHEN fraud_label IN ('SUSPICIOUS', 'FRAUDULENT') THEN total_billed ELSE 0 END), 0) as flagged_amount,
      COALESCE(ROUND(AVG(fraud_score)::numeric, 2), 0) as avg_fraud_score
    FROM claims`
  )

  const row = result.rows[0]
  return {
    totalClaims: parseInt(row.total_claims),
    validClaims: parseInt(row.valid_claims),
    suspiciousClaims: parseInt(row.suspicious_claims),
    fraudulentClaims: parseInt(row.fraudulent_claims),
    totalBilled: parseFloat(row.total_billed),
    flaggedAmount: parseFloat(row.flagged_amount),
    avgFraudScore: parseFloat(row.avg_fraud_score),
  }
}

// ============================================
// CLAIMS FOR ML SCORING
// ============================================

export async function getClaimsForMLScoring(): Promise<Claim[]> {
  const result = await query<Claim>(
    `SELECT * FROM claims ORDER BY created_at DESC`
  )
  return result.rows
}

export async function getAllClaimsForTraining(): Promise<ClaimWithDetails[]> {
  const result = await query<ClaimWithDetails>(
    `SELECT c.*, 
            m.full_name as member_name, 
            m.member_number,
            m.date_of_birth,
            m.gender,
            p.facility_name, 
            p.facility_code,
            p.facility_type
     FROM claims c
     JOIN members m ON c.member_id = m.id
     JOIN providers p ON c.provider_id = p.id`
  )
  return result.rows
}

// ============================================
// CLAIM PAGINATION OPERATIONS
// ============================================

export async function getMemberClaimsPaginated(
  memberId: string,
  limit: number = 10,
  offset: number = 0
): Promise<Claim[]> {
  const result = await query<Claim>(
    `SELECT * FROM claims 
     WHERE member_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [memberId, limit, offset]
  )
  return result.rows || []
}

export async function getMemberClaimCount(memberId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) FROM claims WHERE member_id = $1`,
    [memberId]
  )
  return parseInt(result.rows[0]?.count || "0")
}

export async function getClaimsPaginated(
  limit: number = 10,
  offset: number = 0,
  status?: string,
  fraudLabel?: string
): Promise<Claim[]> {
  let whereClause = "WHERE 1=1"
  const params: any[] = []

  if (status) {
    params.push(status)
    whereClause += ` AND status = $${params.length}`
  }

  if (fraudLabel) {
    params.push(fraudLabel)
    whereClause += ` AND fraud_label = $${params.length}`
  }

  params.push(limit)
  params.push(offset)

  const result = await query<Claim>(
    `SELECT * FROM claims 
     ${whereClause}
     ORDER BY created_at DESC 
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return result.rows || []
}

export async function getClaimCount(status?: string, fraudLabel?: string): Promise<number> {
  let whereClause = "WHERE 1=1"
  const params: any[] = []

  if (status) {
    params.push(status)
    whereClause += ` AND status = $${params.length}`
  }

  if (fraudLabel) {
    params.push(fraudLabel)
    whereClause += ` AND fraud_label = $${params.length}`
  }

   const result = await query<{ count: string }>(
     `SELECT COUNT(*) FROM claims ${whereClause}`,
     params
   )
   return parseInt(result.rows[0]?.count || "0")
 }

// ============================================
// SUPPORTING DOCUMENTS
// ============================================

export interface ClaimSupportingDocument {
  id: string
  claim_id: string
  file_name: string
  file_path: string
  file_size: number
  content_type: string
  description: string
  created_at: string
}

export async function addSupportingDocument(data: {
  claimId: string
  fileName: string
  filePath: string
  fileSize: number
  contentType: string
  description?: string
  uploadedBy?: string
}): Promise<ClaimSupportingDocument> {
  const result = await query<ClaimSupportingDocument>(
    `INSERT INTO claim_supporting_documents
       (claim_id, file_name, file_path, file_size, content_type, description, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.claimId, data.fileName, data.filePath, data.fileSize, data.contentType, data.description || null, data.uploadedBy || null]
  )
  return result.rows[0]
}

export async function getSupportingDocuments(claimId: string): Promise<ClaimSupportingDocument[]> {
  const result = await query<ClaimSupportingDocument>(
    `SELECT * FROM claim_supporting_documents WHERE claim_id = $1 ORDER BY created_at DESC`,
    [claimId]
  )
  return result.rows
}

// ============================================
// WALLET OPERATIONS
// ============================================

export interface Wallet {
  wallet_id: number
  member_id: number
  balance: number
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  transaction_id: number
  wallet_id: number
  amount: number
  transaction_type: "CREDIT" | "DEBIT"
  description: string
  related_claim_id: number | null
  created_at: string
}

export async function getWalletByMemberId(memberId: number): Promise<Wallet | null> {
  const result = await query<Wallet>(
    `SELECT * FROM wallets WHERE member_id = $1`,
    [memberId]
  )
  return result.rows[0] || null
}

export async function getWalletTransactions(walletId: number, limit = 20): Promise<WalletTransaction[]> {
  const result = await query<WalletTransaction>(
    `SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [walletId, limit]
  )
  return result.rows
}

export async function getAllWallets(): Promise<(Wallet & { member_name: string; member_number: string })[]> {
  const result = await query<Wallet & { member_name: string; member_number: string }>(
    `SELECT w.*, m.full_name as member_name, m.member_number
     FROM wallets w
     JOIN members m ON w.member_id = m.id
     ORDER BY w.balance DESC`
  )
  return result.rows
}

export async function creditWallet(memberId: number, amount: number, description: string, relatedClaimId?: number): Promise<WalletTransaction> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(`UPDATE wallets SET balance = balance + $1 WHERE member_id = $2`, [amount, memberId])
    const result = await client.query<WalletTransaction>(
      `INSERT INTO wallet_transactions (wallet_id, amount, transaction_type, description, related_claim_id)
       SELECT wallet_id, $1, 'CREDIT', $2, $3 FROM wallets WHERE member_id = $4
       RETURNING *`,
      [amount, description, relatedClaimId || null, memberId]
    )
    await client.query("COMMIT")
    return result.rows[0]
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
  }
}

// ============================================
// PREMIUM OPERATIONS
// ============================================

export interface Premium {
  premium_id: number
  member_id: number
  amount: number
  status: "ACTIVE" | "INACTIVE" | "PENDING"
  payment_date: string
  expiry_date: string
  created_at: string
  updated_at: string
}

export async function getPremiumByMemberId(memberId: number): Promise<Premium | null> {
  const result = await query<Premium>(
    `SELECT * FROM premiums WHERE member_id = $1 ORDER BY premium_id DESC LIMIT 1`,
    [memberId]
  )
  return result.rows[0] || null
}

export async function getPremiumStats(): Promise<{
  totalMembers: number
  activePremium: number
  inactivePremium: number
  pendingPremium: number
  totalRevenue: number
}> {
  const result = await query<{
    total_members: string
    active: string
    inactive: string
    pending: string
    revenue: string
  }>(
    `SELECT
      COUNT(DISTINCT m.id) as total_members,
      COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN m.id END) as active,
      COUNT(DISTINCT CASE WHEN p.status = 'INACTIVE' THEN m.id END) as inactive,
      COUNT(DISTINCT CASE WHEN p.status = 'PENDING' THEN m.id END) as pending,
      COALESCE(SUM(CASE WHEN p.status = 'ACTIVE' THEN p.amount ELSE 0 END), 0) as revenue
     FROM members m
     LEFT JOIN premiums p ON p.member_id = m.id`
  )
  const row = result.rows[0]
  return {
    totalMembers: parseInt(row.total_members),
    activePremium: parseInt(row.active),
    inactivePremium: parseInt(row.inactive),
    pendingPremium: parseInt(row.pending),
    totalRevenue: parseFloat(row.revenue),
  }
}

// ============================================
// FRAUD RULE ENGINE
// ============================================

export interface FraudRuleResult {
  ruleName: string
  passed: boolean
  reason: string
}

export async function validateClaimRules(claimId: number): Promise<FraudRuleResult[]> {
  const claim = await getClaimById(String(claimId))
  if (!claim) throw new Error("Claim not found")

  const results: FraudRuleResult[] = []
  const now = new Date()
  const serviceDate = new Date(claim.service_date)

  // Rule 1: Timing Rule (service date within 7 days of submission timestamp)
  const submissionDate = new Date(claim.submission_date || claim.created_at)
  const daysDiff = Math.floor((submissionDate.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24))
  const timingValid = daysDiff >= 0 && daysDiff <= 7
  results.push({
    ruleName: "Timing Rule",
    passed: timingValid,
    reason: timingValid
      ? `Service date is within 7 days of submission (${daysDiff} days)`
      : `Service date is ${daysDiff < 0 ? Math.abs(daysDiff) + " days before" : daysDiff + " days after"} submission — must be within 7 days`,
  })

  // Rule 2: Hospital Rule (provider must exist and be active)
  const provider = await getProviderById(claim.provider_id)
  results.push({
    ruleName: "Hospital Rule",
    passed: !!provider,
    reason: provider
      ? `Provider ${provider.facility_name} is registered`
      : "Provider not found in system",
  })

  // Rule 3: Member Rule (member must exist and have active cover)
  const member = await getMemberById(String(claim.member_id))
  if (!member) {
    results.push({
      ruleName: "Member Rule",
      passed: false,
      reason: "Member not found",
    })
  } else {
    const premium = await getPremiumByMemberId(Number(claim.member_id))
    const hasActiveCover = member.cover_status === "ACTIVE"
    const hasActivePremium = premium?.status === "ACTIVE"
    const premiumNotExpired = premium ? new Date(premium.expiry_date) >= now : false
    results.push({
      ruleName: "Member Rule",
      passed: hasActiveCover && hasActivePremium && premiumNotExpired,
      reason: hasActiveCover && hasActivePremium && premiumNotExpired
        ? `Member ${member.member_number} is active with valid premium`
        : `Member cover: ${member.cover_status}, premium: ${premium?.status || "none"}, expired: ${premium ? !premiumNotExpired : "N/A"}`,
    })
  }

  // Rule 4: Frequency Rule (max 5 claims per month per member)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const freqResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM claims
     WHERE member_id = $1
       AND service_date >= $2
       AND service_date <= $3
       AND id != $4`,
    [claim.member_id, monthStart.toISOString().split("T")[0], now.toISOString().split("T")[0], claimId]
  )
  const claimCount = parseInt(freqResult.rows[0]?.count || "0")
  results.push({
    ruleName: "Frequency Rule",
    passed: claimCount < 5,
    reason: claimCount < 5
      ? `${claimCount} claims this month (limit: 5)`
      : `${claimCount} claims this month exceeds limit of 5`,
  })

  // Rule 5: Duplication Rule (no duplicate within 6 months)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const dupResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM claims
     WHERE member_id = $1
       AND provider_id = $2
       AND service_date = $3
       AND total_billed = $4
       AND id != $5
       AND service_date >= $6`,
    [claim.member_id, claim.provider_id, claim.service_date, claim.total_billed, claimId, sixMonthsAgo.toISOString().split("T")[0]]
  )
  const dupCount = parseInt(dupResult.rows[0]?.count || "0")
  results.push({
    ruleName: "Duplication Rule",
    passed: dupCount === 0,
    reason: dupCount === 0
      ? "No duplicate claims found in past 6 months"
      : `Found ${dupCount} duplicate claim(s) within 6 months (same member, provider, date, amount)`,
  })

  // Rule 6: Premium Status Check
  if (member) {
    const premium = await getPremiumByMemberId(Number(claim.member_id))
    results.push({
      ruleName: "Premium Status",
      passed: premium?.status === "ACTIVE",
      reason: premium?.status === "ACTIVE"
        ? "Premium payment is active"
        : `Premium status is ${premium?.status || "not found"} - member must pay premium`,
    })
  } else {
    results.push({
      ruleName: "Premium Status",
      passed: false,
      reason: "Cannot verify premium - member not found",
    })
  }

  return results
}

export function calculateReimbursement(
  claimedAmount: number,
  deductible = 20000,
  coveragePercentage = 0.8,
  coPayment = 2000
): { reimbursement: number; breakdown: string } {
  const afterDeductible = Math.max(0, claimedAmount - deductible)
  const afterCoverage = afterDeductible * coveragePercentage
  const reimbursement = Math.max(0, afterCoverage - coPayment)
  const breakdown = `KSh ${claimedAmount.toLocaleString()} - KSh ${deductible.toLocaleString()} deductible = KSh ${afterDeductible.toLocaleString()} × ${coveragePercentage * 100}% = KSh ${afterCoverage.toLocaleString()} - KSh ${coPayment.toLocaleString()} co-pay = KSh ${reimbursement.toLocaleString()}`
  return { reimbursement, breakdown }
}

// ============================================
// DASHBOARD STATS WITH CHARTS DATA
// ============================================

export async function getAdminDashboardStats(): Promise<{
  totalClaims: number
  validClaims: number
  suspiciousClaims: number
  fraudulentClaims: number
  totalAmount: number
  flaggedAmount: number
  avgFraudScore: number
  topFraudProviders: Array<{ facility_name: string; fraud_count: number; total_claims: number; fraud_rate: number }>
  recentFraudulent: Array<{ id: string; claim_number: string; member_name: string; fraud_score: number; total_billed: number; created_at: string }>
  claimsByStatus: Array<{ status: string; count: number }>
  claimsByServiceType: Array<{ service_type: string; count: number }>
  fraudTrend: Array<{ date: string; count: number; avg_score: number }>
  premiumStats: { totalMembers: number; activePremium: number; inactivePremium: number; pendingPremium: number; totalRevenue: number }
  totalWalletsBalance: number
}> {
  const stats = await getDashboardStats()

  const statusResult = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) as count FROM claims GROUP BY status ORDER BY count DESC`
  )

  const serviceTypeResult = await query<{ service_type: string; count: string }>(
    `SELECT service_type, COUNT(*) as count FROM claims GROUP BY service_type ORDER BY count DESC`
  )

  const fraudTrendResult = await query<{ date: string; count: string; avg_score: string }>(
    `SELECT DATE(created_at) as date, COUNT(*) as count, ROUND(AVG(fraud_score)::numeric, 1) as avg_score
     FROM claims
     WHERE fraud_label != 'VALID'
     GROUP BY DATE(created_at)
     ORDER BY date DESC
     LIMIT 30`
  )

  const premiumStats = await getPremiumStats()

  const walletsResult = await query<{ balance: string }>(
    `SELECT COALESCE(SUM(balance), 0) as balance FROM wallets`
  )
  const totalWalletsBalance = parseFloat(walletsResult.rows[0]?.balance || "0")

  return {
    totalClaims: stats.totalClaims,
    validClaims: stats.validClaims,
    suspiciousClaims: stats.suspiciousClaims,
    fraudulentClaims: stats.fraudulentClaims,
    totalAmount: stats.totalBilled,
    flaggedAmount: stats.flaggedAmount,
    avgFraudScore: stats.avgFraudScore,
    topFraudProviders: [],
    recentFraudulent: [],
    claimsByStatus: statusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
    claimsByServiceType: serviceTypeResult.rows.map(r => ({ service_type: r.service_type, count: parseInt(r.count) })),
    fraudTrend: fraudTrendResult.rows.map(r => ({
      date: r.date,
      count: parseInt(r.count),
      avg_score: parseFloat(r.avg_score),
    })),
    premiumStats,
    totalWalletsBalance,
  }
}

