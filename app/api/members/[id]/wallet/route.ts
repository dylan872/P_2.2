import { query, getWalletByMemberId, getWalletTransactions, calculateReimbursement } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const memberResult = await query<{ id: string }>(
      `SELECT id FROM members WHERE member_number = $1 OR id = $1`,
      [id]
    )
    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Member not found" },
        { status: 404 }
      )
    }
    const memberDbId = memberResult.rows[0].id

    const wallet = await getWalletByMemberId(parseInt(memberDbId))

    const pendingClaimsResult = await query<{
      id: string
      claim_number: string
      total_billed: number
      status: string
      service_date: string
    }>(
      `SELECT id, claim_number, total_billed, status, service_date
       FROM claims
       WHERE member_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'FLAGGED')`,
      [memberDbId]
    )
    const pendingClaims = pendingClaimsResult.rows || []

    const pendingReimbursement = pendingClaims.reduce((sum, c) => {
      const result = calculateReimbursement(Number(c.total_billed))
      return sum + result.reimbursement
    }, 0)

    const transactions = wallet
      ? await getWalletTransactions(wallet.wallet_id, 50)
      : []

    const currentBalance = wallet ? Number(wallet.balance) : 0
    const projectedBalance = currentBalance + pendingReimbursement

    return NextResponse.json({
      success: true,
      data: {
        wallet: wallet
          ? { ...wallet, balance: currentBalance }
          : { wallet_id: 0, member_id: parseInt(memberDbId), balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        transactions,
        pendingClaims,
        pendingReimbursement,
        currentBalance,
        projectedBalance,
      },
    })
  } catch (error) {
    console.error("[members/[id]/wallet] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
