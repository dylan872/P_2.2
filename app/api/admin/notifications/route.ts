import { query } from "@/lib/db/operations"
import { NextResponse } from "next/server"

const viewedNotifications = new Set<string>()

export async function GET() {
  try {
    const result = await query<{
      id: string; claim_number: string; fraud_score: number
      fraud_label: string; total_billed: string; created_at: string; full_name: string
    }>(
      `SELECT c.id, c.claim_number, c.fraud_score, c.fraud_label,
              c.total_billed, c.created_at, m.full_name
       FROM claims c
       JOIN members m ON c.member_id = m.id
       ORDER BY c.created_at DESC
       LIMIT 20`
    )

    const notifications = result.rows.map(claim => ({
      id: claim.id,
      claimNumber: claim.claim_number,
      memberName: claim.full_name || "Unknown",
      fraudScore: claim.fraud_score,
      fraudLabel: claim.fraud_label,
      totalBilled: Number(claim.total_billed),
      createdAt: claim.created_at,
      viewed: viewedNotifications.has(claim.id),
    }))

    return NextResponse.json({ success: true, data: notifications })
  } catch (error) {
    console.error("Notifications error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch notifications" }, { status: 500 })
  }
}