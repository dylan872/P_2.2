import { query, updateClaimStatus, creditWallet, calculateReimbursement } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { approved_amount, notes } = body

    const claimResult = await query<{ member_id: string; total_billed: string; claim_number: string }>(
      `SELECT member_id, total_billed, claim_number FROM claims WHERE id = $1`,
      [id]
    )
    if (claimResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Claim not found" },
        { status: 404 }
      )
    }
    const claim = claimResult.rows[0]
    const memberId = parseInt(claim.member_id)
    const approved = approved_amount || parseFloat(claim.total_billed)

    await updateClaimStatus(id, "APPROVED", approved)

    const reimburseResult = calculateReimbursement(approved)
    if (reimburseResult.reimbursement > 0) {
      await creditWallet(
        memberId,
        reimburseResult.reimbursement,
        `Reimbursement for claim ${claim.claim_number}`,
        parseInt(id)
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "APPROVED",
        approved_amount: approved,
        wallet_credited: reimburseResult.reimbursement,
        breakdown: reimburseResult.breakdown,
      },
    })
  } catch (error) {
    console.error("[claims/approve] POST error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    )
  }
}
