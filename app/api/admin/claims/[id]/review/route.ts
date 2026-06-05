import { query, validateClaimRules, calculateReimbursement, creditWallet } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, notes } = body

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      )
    }

    // Get the claim first to check current status, total billed and fraud state
    const claimResult = await query<{
      id: string
      claim_number: string
      status: string
      total_billed: number
      fraud_label: string
      fraud_score: number
    }>(
      `SELECT id, claim_number, status, total_billed, fraud_label, fraud_score
         FROM claims WHERE id = $1`,
      [id]
    )

    if (claimResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Claim not found" },
        { status: 404 }
      )
    }

    const existing = claimResult.rows[0]
    const newStatus = action === "approve" ? "APPROVED" : "REJECTED"
    const newApprovedAmount = action === "approve"
      ? Number(existing.total_billed)
      : null

    // When approved: clear fraud label/score — admin has reviewed and accepted the claim.
    // When rejected: preserve fraud state for audit trail.
    const wasFlagged =
      existing.fraud_label === "FRAUDULENT" ||
      existing.fraud_label === "SUSPICIOUS"

    // Update the claim
    await query(
      `UPDATE claims SET
         status          = $1,
         fraud_label     = $2,
         fraud_score     = $3,
         approved_amount = $4,
         notes           = COALESCE($5, notes),
         updated_at      = NOW()
       WHERE id = $6`,
      [
        newStatus,
        action === "approve" ? "VALID" : existing.fraud_label,
        action === "approve" ? 0               : existing.fraud_score,
        newApprovedAmount,
        notes || null,
        id,
      ]
    )

    // If approved and it was flagged, remove the fraud flags from the audit table
    if (action === "approve" && wasFlagged) {
      await query(`DELETE FROM fraud_flags WHERE claim_id = $1`, [id])
    }

    if (action === "approve" && newApprovedAmount) {
      const memberResult = await query<{ member_id: string; claim_number: string }>(
        `SELECT member_id, claim_number FROM claims WHERE id = $1`,
        [id]
      )
      if (memberResult.rows.length > 0) {
        const { member_id, claim_number } = memberResult.rows[0]
        const reimburseResult = calculateReimbursement(Number(newApprovedAmount))
        if (reimburseResult.reimbursement > 0) {
          await creditWallet(
            parseInt(member_id),
            reimburseResult.reimbursement,
            `Reimbursement for claim ${claim_number}`,
            parseInt(id)
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Claim ${action === "approve" ? "approved" : "rejected"} successfully`,
    })
  } catch (error) {
    console.error("Claim review error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to review claim" },
      { status: 500 }
    )
  }
}
