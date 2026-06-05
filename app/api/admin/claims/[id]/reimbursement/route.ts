import { calculateReimbursement } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { claimed_amount } = Object.fromEntries(new URL(request.url).searchParams)

    if (!claimed_amount) {
      return NextResponse.json(
        { success: false, message: "claimed_amount query parameter is required" },
        { status: 400 }
      )
    }

    const amount = parseFloat(claimed_amount as string)
    const result = calculateReimbursement(amount)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[reimbursement] GET error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
