import { query } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const profilePicture: string | undefined = body.profilePicture

    if (!profilePicture) {
      return NextResponse.json(
        { success: false, message: "profilePicture is required" },
        { status: 400 }
      )
    }

    // id may be a member_number string OR a UUID — handle both
    const lookupResult = await query<{ id: string }>(
      `SELECT id FROM members WHERE member_number = $1 OR id::text = $1 LIMIT 1`,
      [id]
    )

    const memberId = lookupResult.rows[0]?.id
    if (!memberId) {
      return NextResponse.json(
        { success: false, message: "Member not found" },
        { status: 404 }
      )
    }

    // Correct column name is profile_picture_url
    await query(
      `UPDATE members
       SET profile_picture_url = $1, updated_at = NOW()
       WHERE id = $2`,
      [profilePicture, memberId]
    )

    return NextResponse.json({
      success: true,
      data: { profilePicture },
    })
  } catch (error) {
    console.error("[profile-picture] PATCH error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}