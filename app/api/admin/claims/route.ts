import { query } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id        = searchParams.get("id")
    const status    = searchParams.get("status")
     const fraudLabel = searchParams.get("fraudLabel")
    const search     = searchParams.get("search")?.trim().toLowerCase()
    const page      = parseInt(searchParams.get("page") || "1")
    const limit     = parseInt(searchParams.get("limit") || "50")
    const offset    = (page - 1) * limit

    // ── Single-claim fetch by ID ──────────────────────────────────────────────
    if (id) {
      const result = await query<{
        id: string
        claim_number: string
        service_date: string
        service_type: string
        diagnosis_code: string
        diagnosis_desc: string
        total_billed: number
        approved_amount: number | null
        status: string
        fraud_score: number
        fraud_label: string
        notes: string
        rejection_reason: string | null
        created_at: string
        member_id: string
        member_full_name: string
        member_number: string
        provider_id: string
        facility_name: string
        facility_code: string
      }>(
      `SELECT
         c.id, c.claim_number, c.service_date, c.service_type,
         c.diagnosis_code, c.diagnosis_desc,
         c.total_billed, c.approved_amount,
         c.status, c.fraud_score, c.fraud_label,
         c.notes, c.rejection_reason, c.created_at,
         c.member_id,
         m.full_name  AS member_full_name,
         m.member_number,
         c.provider_id,
         p.facility_name,
         p.facility_code
       FROM claims c
         JOIN members  m ON c.member_id   = m.id
         JOIN providers p ON c.provider_id = p.id
         WHERE c.id = $1`,
        [id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Claim not found" },
          { status: 404 }
        )
      }

      const row = result.rows[0]

      // Fetch fraud flags for this claim
      const flagsResult = await query<{
        claim_id: string
        flag_type: string
        flag_reason: string
        severity: string
      }>(
        `SELECT claim_id, flag_type, flag_reason, severity
         FROM fraud_flags WHERE claim_id = $1`,
        [id]
      )
      const fraud_flags = flagsResult.rows.map(r => ({
        flag_type:   r.flag_type,
        flag_reason: r.flag_reason,
        severity:    r.severity,
      }))

      return NextResponse.json({
        success: true,
        data: {
          ...row,
          rejection_reason: row.rejection_reason,
          member: {
            id:            row.member_id,
            full_name:     row.member_full_name,
            member_number: row.member_number,
          },
          provider: {
            id:           row.provider_id,
            facility_name: row.facility_name,
            facility_code: row.facility_code,
          },
          fraud_flags,
        },
      })
    }

    // ── List fetch (unchanged) ─────────────────────────────────────────────────
    const conditions: string[] = []
    const params: unknown[]    = []
    let idx = 1

    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      conditions.push(`(LOWER(c.claim_number) LIKE $${idx++} OR LOWER(m.full_name) LIKE $${idx++} OR LOWER(m.member_number) LIKE $${idx++} OR LOWER(p.facility_name) LIKE $${idx++} OR LOWER(p.facility_code) LIKE $${idx++} OR LOWER(c.diagnosis_desc) LIKE $${idx++})`)
    }

    if (status) {
      conditions.push(`c.status = $${idx++}`)
      params.push(status)
    }
    if (fraudLabel) {
      conditions.push(`c.fraud_label = $${idx++}`)
      params.push(fraudLabel)
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const claimsResult = await query<{
      id: string
      claim_number: string
      service_date: string
      service_type: string
      diagnosis_code: string
      diagnosis_desc: string
      total_billed: number
      approved_amount: number | null
      status: string
      fraud_score: number
      fraud_label: string
      notes: string
      rejection_reason: string | null
      created_at: string
      member_id: string
      member_db_id: string
      member_full_name: string
      member_number: string
      provider_id: string
      provider_db_id: string
      facility_name: string
      facility_code: string
    }>(
      `SELECT
         c.id,
         c.claim_number,
         c.service_date,
         c.service_type,
         c.diagnosis_code,
         c.diagnosis_desc,
         c.total_billed,
         c.approved_amount,
         c.status,
         c.fraud_score,
         c.fraud_label,
         c.notes,
         c.rejection_reason,
         c.created_at,
         c.member_id,
         m.id   AS member_db_id,
         m.full_name  AS member_full_name,
         m.member_number,
         c.provider_id,
         p.id   AS provider_db_id,
         p.facility_name,
         p.facility_code
       FROM claims c
       JOIN members  m ON c.member_id   = m.id
       JOIN providers p ON c.provider_id = p.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM claims c ${where}`,
      params
    )
    const total = parseInt(countResult.rows[0]?.count || "0")

    const claimIds = claimsResult.rows.map((r) => r.id)
    let flagsByClaimId: Record<string, Array<{ flag_type: string; flag_reason: string; severity: string }>> = {}

    if (claimIds.length > 0) {
      const flagsResult = await query<{
        claim_id: string
        flag_type: string
        flag_reason: string
        severity: string
      }>(
        `SELECT claim_id, flag_type, flag_reason, severity
         FROM fraud_flags
         WHERE claim_id = ANY($1::uuid[])`,
        [claimIds]
      )
      for (const row of flagsResult.rows) {
        if (!flagsByClaimId[row.claim_id]) flagsByClaimId[row.claim_id] = []
        flagsByClaimId[row.claim_id].push({
          flag_type: row.flag_type,
          flag_reason: row.flag_reason,
          severity: row.severity,
        })
      }
    }

    const data = claimsResult.rows.map((row) => ({
      id: row.id,
      claim_number: row.claim_number,
      service_date: row.service_date,
      service_type: row.service_type,
      diagnosis_code: row.diagnosis_code,
      diagnosis_desc: row.diagnosis_desc,
      total_billed: Number(row.total_billed),
      approved_amount: row.approved_amount ? Number(row.approved_amount) : null,
      status: row.status,
      fraud_score: Number(row.fraud_score),
      fraud_label: row.fraud_label,
      notes: row.notes,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      member: {
        id: row.member_db_id,
        full_name: row.member_full_name,
        member_number: row.member_number,
      },
      provider: {
        id: row.provider_db_id,
        facility_name: row.facility_name,
        facility_code: row.facility_code,
      },
      fraud_flags: flagsByClaimId[row.id] || [],
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("[admin/claims] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    )
  }
}