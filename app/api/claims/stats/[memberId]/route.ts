import { getMemberById, getMemberByMemberNumber, query } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

    // memberId from session is the member_number string, not a UUID
    let member = await getMemberByMemberNumber(memberId)
    if (!member) member = await getMemberById(memberId)

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Member not found" },
        { status: 404 }
      )
    }

    const result = await query<{
      status: string
      total_billed: string
      approved_amount: string | null
    }>(
      `SELECT status, total_billed, approved_amount
       FROM claims
       WHERE member_id = $1`,
      [member.id]
    )

    const rows = result.rows || []

    return NextResponse.json({
      success: true,
      data: {
        totalClaims:       rows.length,
        approvedClaims:    rows.filter((c) => c.status === "APPROVED").length,
        pendingClaims:     rows.filter((c) => c.status === "PENDING").length,
        rejectedClaims:    rows.filter((c) => c.status === "REJECTED").length,
        underReviewClaims: rows.filter((c) => c.status === "UNDER_REVIEW" || c.status === "FLAGGED").length,
        totalClaimed:      rows.reduce((sum, c) => sum + (parseFloat(c.total_billed) || 0), 0),
        totalApproved:     rows.reduce((sum, c) => sum + (parseFloat(c.approved_amount ?? "0") || 0), 0),
      },
    })
  } catch (error) {
    console.error("[claims/stats] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}