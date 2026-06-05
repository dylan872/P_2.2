import { query, getWalletByMemberId, calculateReimbursement } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let whereClause = "WHERE 1=1"
    const params: unknown[] = []
    let idx = 1

    if (status && status !== "all") {
      whereClause += ` AND cover_status = $${idx++}`
      params.push(status)
    }

    const membersResult = await query<{
      id: string
      member_number: string
      full_name: string
      insurer_type: string
      cover_status: string
    }>(
      `SELECT id, member_number, full_name, insurer_type, cover_status
       FROM members
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    )

    const enrichedMembers = await Promise.all(
      membersResult.rows.map(async (member) => {
        const wallet = await getWalletByMemberId(parseInt(member.id))
        const currentBalance = wallet ? Number(wallet.balance) : 0

        const pendingResult = await query<{ total_billed: number; status: string }>(
          `SELECT total_billed, status
           FROM claims
           WHERE member_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'FLAGGED')`,
          [member.id]
        )

        let pendingReimbursement = 0
        for (const claim of pendingResult.rows) {
          const result = calculateReimbursement(Number(claim.total_billed))
          pendingReimbursement += result.reimbursement
        }

        return {
          id: member.id,
          member_number: member.member_number,
          full_name: member.full_name,
          insurer_type: member.insurer_type,
          cover_status: member.cover_status,
          wallet_balance: currentBalance,
          pending_claims_count: pendingResult.rows.length,
          pending_reimbursement: pendingReimbursement,
          projected_balance: currentBalance + pendingReimbursement,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedMembers,
    })
  } catch (error) {
    console.error("[admin/members] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
