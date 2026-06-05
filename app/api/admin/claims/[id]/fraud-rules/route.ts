import { validateClaimRules } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rules = await validateClaimRules(parseInt(id))
    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    console.error("[fraud-rules] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
