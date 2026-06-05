import { query, getWalletByMemberId, getWalletTransactions, getAllWallets, getPremiumByMemberId, getPremiumStats, getAdminDashboardStats, validateClaimRules, calculateReimbursement, creditWallet } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")
    const walletId = searchParams.get("walletId")

    if (walletId) {
      const txs = await getWalletTransactions(parseInt(walletId))
      return NextResponse.json({ success: true, data: txs })
    }

    if (memberId) {
      const wallet = await getWalletByMemberId(parseInt(memberId))
      const premium = await getPremiumByMemberId(parseInt(memberId))
      return NextResponse.json({
        success: true,
        data: {
          wallet,
          premium,
        },
      })
    }

    const wallets = await getAllWallets()
    return NextResponse.json({ success: true, data: wallets })
  } catch (error) {
    console.error("[wallets] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, amount, description, relatedClaimId, type } = body

    if (!memberId || !amount) {
      return NextResponse.json(
        { success: false, message: "memberId and amount are required" },
        { status: 400 }
      )
    }

    if (type === "CREDIT") {
      const tx = await creditWallet(memberId, amount, description || "Reimbursement", relatedClaimId)
      return NextResponse.json({ success: true, data: tx })
    }

    return NextResponse.json(
      { success: false, message: "Invalid transaction type" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[wallets] POST error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
