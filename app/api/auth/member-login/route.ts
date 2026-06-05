import { getMemberByCredentials } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { memberNumber, nationalId } = await request.json()

    if (!memberNumber || !nationalId) {
      return NextResponse.json(
        { success: false, message: "Member Number and National ID are required" },
        { status: 400 }
      )
    }

    // Query the members table to find matching credentials
    const member = await getMemberByCredentials(memberNumber, nationalId)

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Invalid Member ID or National ID" },
        { status: 401 }
      )
    }

    // Check if cover is active
    if (member.cover_status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: `Your cover is ${member.cover_status.toLowerCase()}. Please contact support.`,
        },
        { status: 403 }
      )
    }

    // Return member data
    return NextResponse.json({
      success: true,
      data: {
        member: {
          id: member.id,
          memberNumber: member.member_number,
          nationalId: member.national_id,
          fullName: member.full_name,
          dateOfBirth: member.date_of_birth,
          gender: member.gender,
          phoneNumber: member.phone_number,
          address: member.address,
          insurerType: member.insurer_type,
          policyNumber: member.policy_number,
          coverStatus: member.cover_status,
          coverExpiry: member.cover_expiry,
          role: member.role || "user",
        },
      },
    })
  } catch (error) {
    console.error("[v0] Member login error:", error)
    return NextResponse.json(
      { success: false, message: "Login failed. Please try again." },
      { status: 500 }
    )
  }
}