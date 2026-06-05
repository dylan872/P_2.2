import { NextRequest, NextResponse } from "next/server"

// In-memory store for viewed notifications (shared with parent route)
// In production, use database or Redis
const viewedNotifications = new Set<string>()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    viewedNotifications.add(id)

    return NextResponse.json({
      success: true,
      message: "Notification marked as viewed",
    })
  } catch (error) {
    console.error("Mark notification viewed error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to mark notification as viewed" },
      { status: 500 }
    )
  }
}
