import { NextRequest, NextResponse } from "next/server"
import { ClaimSchema, type ClaimData } from "@/lib/claim-schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the claim data
    const validationResult = ClaimSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid claim data",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const claimData: ClaimData = validationResult.data

    console.log("Claim submitted:", {
      id: claimData.id,
      claimNumber: claimData.claimNumber,
      memberId: claimData.memberId,
      totalBilled: claimData.totalBilled,
    })

    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      message: "Claim submitted successfully",
      claimId: claimData.id,
      receivedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error processing claim submission:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process claim submission" },
      { status: 500 }
    )
  }
}