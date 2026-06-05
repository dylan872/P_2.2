import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// In-memory store for viewed notifications
const viewedNotifications = new Set<string>()

export async function POST() {
  try {
    const supabase = await createClient()

    // Get all recent claim IDs and mark them as viewed
    const { data: recentClaims, error } = await supabase
      .from("claims")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error

    recentClaims?.forEach(claim => {
      viewedNotifications.add(claim.id)
    })

    return NextResponse.json({
      success: true,
      message: "All notifications marked as viewed",
    })
  } catch (error) {
    console.error("Mark all notifications viewed error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to mark notifications as viewed" },
      { status: 500 }
    )
  }
}
