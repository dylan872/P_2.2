import {
  getMemberByMemberNumber,
  getMemberById,
  createClaim,
  query,
  updateClaimStatus,
  creditWallet,
  calculateReimbursement,
} from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"
import { processClaimAutomatically } from "@/lib/claim-processor"
import { SubmitClaimRequest } from "@/lib/claim-schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page       = parseInt(searchParams.get("page")   || "1")
    const limit      = parseInt(searchParams.get("limit")  || "10")
    const memberId   = searchParams.get("memberId")
    const status     = searchParams.get("status")
    const fraudLabel = searchParams.get("fraudLabel")
    const offset     = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[]    = []
    let idx = 1

    if (memberId) {
      // Session stores member_number string (e.g. "SHA-2024-000001"), not the UUID
      let member = await getMemberByMemberNumber(memberId)
      if (!member) member = await getMemberById(memberId)
      if (!member) {
        return NextResponse.json(
          { success: false, message: "Member not found" },
          { status: 404 }
        )
      }
      conditions.push(`c.member_id = $${idx++}`)
      params.push(member.id)
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

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM claims c ${where}`,
      params
    )
    const total = parseInt(countResult.rows[0]?.count || "0")

    const claimsResult = await query<{
      id: string
      claim_number: string
      member_id: string
      provider_id: string
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
      created_at: string
      updated_at: string
      facility_name: string
      facility_code: string
    }>(
      `SELECT
         c.id, c.claim_number, c.member_id, c.provider_id,
         c.service_date, c.service_type,
         c.diagnosis_code, c.diagnosis_desc,
         c.total_billed, c.approved_amount,
         c.status, c.fraud_score, c.fraud_label,
         c.notes, c.created_at, c.updated_at,
         p.facility_name,
         p.facility_code
       FROM claims c
       JOIN providers p ON c.provider_id = p.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )

    const data = claimsResult.rows.map((row) => ({
      ...row,
      total_billed:    Number(row.total_billed),
      approved_amount: row.approved_amount != null ? Number(row.approved_amount) : null,
      fraud_score:     Number(row.fraud_score),
      provider: {
        facility_name: row.facility_name,
        facility_code: row.facility_code,
      },
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("[claims] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const memberNumber  = body.memberNumber || body.memberId || body.member_number
    const diagnosis     = body.diagnosis || body.diagnosisDesc || body.diagnosis_desc || "General consultation"
    const serviceType   = body.serviceType || body.service_type || "OUTPATIENT"
    const totalBilled   = Number(body.totalBilled ?? body.total_billed ?? 0)
    const notes         = body.notes || ""
    const serviceDate   = body.serviceDate || body.service_date || new Date().toISOString().split("T")[0]
    const diagnosisCode = body.diagnosisCode || body.diagnosis_code || "A00"
    const diagnosisDesc = body.diagnosisDesc || body.diagnosis_desc || diagnosis
    const lineItems     = body.lineItems || []

    if (!memberNumber) {
      return NextResponse.json(
        { success: false, message: "Member number is required" },
        { status: 400 }
      )
    }
    if (Number.isNaN(totalBilled) || totalBilled < 0) {
      return NextResponse.json(
        { success: false, message: "Total billed must be a positive number" },
        { status: 400 }
      )
    }

    const member = await getMemberByMemberNumber(memberNumber)
    if (!member) {
      return NextResponse.json(
        { success: false, message: "Member not found" },
        { status: 404 }
      )
    }

    const providerResult = await query<{ id: string }>(`SELECT id FROM providers LIMIT 1`)
    const providerId = providerResult.rows[0]?.id
    if (!providerId) {
      return NextResponse.json(
        { success: false, message: "No provider found" },
        { status: 500 }
      )
    }

    const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`

    const submissionDate = new Date().toISOString()

    const newClaim = await createClaim({
      claim_number:   claimNumber,
      member_id:      member.id,
      provider_id:    providerId,
      service_date:   serviceDate,
      diagnosis_code: diagnosisCode,
      diagnosis_desc: diagnosisDesc,
      service_type:   serviceType,
      total_billed:   totalBilled,
      notes,
      status:         "UNDER_REVIEW",
      fraud_score:    50,
      fraud_label:    "SUSPICIOUS",
    })

    if (!newClaim) {
      return NextResponse.json(
        { success: false, message: "Failed to create claim" },
        { status: 500 }
      )
    }

    const claimId = parseInt(newClaim.id)

    const processingResult = await processClaimAutomatically(claimId, {
      totalBilled,
      serviceType,
      diagnosisCode,
      serviceDate,
      submissionDate,
    })

    const finalStatus = processingResult.approvalStatus === "APPROVED"
      ? "APPROVED"
      : processingResult.approvalStatus === "UNDER_REVIEW"
        ? "UNDER_REVIEW"
        : "REJECTED"

    const finalApprovedAmount = processingResult.approvedAmount ?? undefined

    await updateClaimStatus(
      newClaim.id,
      finalStatus,
      finalApprovedAmount,
      processingResult.fraudScore,
      processingResult.fraudLabel
    )

    if (finalStatus === "APPROVED" && processingResult.reimbursement && processingResult.reimbursement > 0) {
      try {
        await creditWallet(
          parseInt(member.id),
          processingResult.reimbursement,
          `Reimbursement for claim ${claimNumber}`,
          claimId
        )
      } catch (walletError) {
        console.error("[claims] Wallet credit failed:", walletError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Claim processed automatically",
      data: {
        id:              newClaim.id,
        claimNumber,
        memberNumber:    member.member_number,
        status:          finalStatus,
        fraudLabel:      processingResult.fraudLabel,
        fraudScore:      processingResult.fraudScore,
        mlLabel:         processingResult.mlLabel,
        mlScore:         processingResult.mlScore,
        mlAvailable:     processingResult.mlAvailable,
        totalBilled:     newClaim.total_billed,
        approvedAmount:  finalApprovedAmount,
        reimbursement:   processingResult.reimbursement,
        rejectionReason: processingResult.rejectionReason,
        rulesPassed:     processingResult.rulesPassed,
        rulesFailed:     processingResult.rulesFailed,
        createdAt:       newClaim.created_at,
      },
    })
  } catch (error) {
    console.error("[claims] POST error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    )
  }
}