import { query, getWalletByMemberId, getWalletTransactions, calculateReimbursement } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: "memberId is required" },
        { status: 400 }
      )
    }

    const wallet = await getWalletByMemberId(parseInt(memberId))
    if (!wallet) {
      return NextResponse.json({
        success: true,
        data: {
          wallet: { wallet_id: 0, member_id: parseInt(memberId), balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          transactions: [],
          pendingClaims: [],
          pendingReimbursement: 0,
          currentBalance: 0,
          projectedBalance: 0,
        },
      })
    }

    const transactions = await getWalletTransactions(wallet.wallet_id, 50)

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
      [parseInt(memberId)]
    )
    const pendingClaims = pendingClaimsResult.rows || []

    const pendingReimbursement = pendingClaims.reduce((sum, c) => {
      const result = calculateReimbursement(Number(c.total_billed))
      return sum + result.reimbursement
    }, 0)

    const currentBalance = Number(wallet.balance)
    const projectedBalance = currentBalance + pendingReimbursement

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        transactions,
        pendingClaims,
        pendingReimbursement,
        currentBalance,
        projectedBalance,
      },
    })
  } catch (error) {
    console.error("[dashboard/wallet] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
