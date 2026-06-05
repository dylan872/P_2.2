import { query, getAdminDashboardStats, getPremiumStats, creditWallet, validateClaimRules, calculateReimbursement } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const stats = await getAdminDashboardStats()
    const premiumStats = await getPremiumStats()

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        premiumStats,
      },
    })
  } catch (error) {
    console.error("[dashboard-stats] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
