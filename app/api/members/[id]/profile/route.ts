import { getMemberById, getMemberByMemberNumber, query } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

interface MemberProfileClaim {
  id: string
  claim_number: string
  service_date: string
  diagnosis_desc: string
  service_type: string
  total_billed: string | number
  approved_amount: string | number | null
  status: string
  fraud_label: string
  fraud_score: number
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log("[v0] Profile API called for id:", id)

    // Try to get member by ID first (integer), then by member_number if not found
    let member = await getMemberByMemberNumber(id)
    if (!member) {
      member = await getMemberById(id)
    }

    if (!member) {
      console.log("[v0] Member not found:", id)
      return NextResponse.json(
        { success: false, message: "Member not found" },
        { status: 404 }
      )
    }

    console.log("[v0] Member found:", member.member_number)

    // Get member's claims for medical history from PostgreSQL
    const claimsResult = await query<MemberProfileClaim>(
      `SELECT 
        id, claim_number, service_date, diagnosis_desc, service_type, 
        total_billed, approved_amount, status, fraud_label, fraud_score
       FROM claims 
       WHERE member_id = $1 
       ORDER BY service_date DESC 
       LIMIT 10`,
      [member.id]
    )
    const claims: MemberProfileClaim[] = claimsResult.rows || []

    const parseAmount = (value: string | number | null | undefined): number => {
      if (typeof value === "number") return value
      if (typeof value === "string") return parseFloat(value) || 0
      return 0
    }

    // Calculate risk assessment
    const totalClaims = claims.length
    const fraudClaims = claims.filter((c) => c.fraud_label === "FRAUDULENT").length
    const totalClaimed = claims.reduce((sum, c) => sum + parseAmount(c.total_billed), 0)
    const totalApproved = claims.reduce((sum, c) => sum + parseAmount(c.approved_amount), 0)

    let riskLevel = "LOW"
    const reasons: string[] = []

    if (fraudClaims > 0) {
      riskLevel = "HIGH"
      reasons.push(`${fraudClaims} fraudulent claims detected`)
    } else if (totalClaims > 20) {
      riskLevel = "MEDIUM"
      reasons.push("High claim frequency")
    }

    // Calculate days to expiry
    let daysToExpiry = null
    if (member.cover_expiry) {
      const expiryDate = new Date(member.cover_expiry)
      // Check if the date is valid
      if (!isNaN(expiryDate.getTime())) {
        const today = new Date()
        daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    // Get unique service types
    const serviceTypes = [...new Set(claims.map((c) => c.service_type))]

    // Helper function to safely calculate age from date string
    const calculateAge = (dateOfBirth: string | null | undefined): number => {
      if (!dateOfBirth) return 0
      const birthDate = new Date(dateOfBirth)
      // Check if the date is valid
      if (isNaN(birthDate.getTime())) return 0
      return Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: member.id,
          memberNumber: member.member_number,
          nationalId: member.national_id,
          fullName: member.full_name,
          dateOfBirth: member.date_of_birth,
          age: calculateAge(member.date_of_birth),
          gender: member.gender,
          phoneNumber: member.phone_number || null,
          address: member.address || null,
          insurerType: member.insurer_type,
          policyNumber: member.policy_number || null,
          coverStatus: member.cover_status,
          coverExpiry: member.cover_expiry ? new Date(member.cover_expiry).toISOString() : null,
          isInsured: member.cover_status === "ACTIVE",
          statusMessage: member.cover_status === "ACTIVE" ? "Cover is active" : `Cover is ${member.cover_status.toLowerCase()}`,
          daysToExpiry,
          profilePicture: null,
          role: member.role || "user",
        },
        riskAssessment: {
          riskLevel,
          reasons,
          totalClaims,
          recentClaims: claims.filter((c) => {
            const date = new Date(c.service_date)
            // Check if the date is valid
            if (isNaN(date.getTime())) return false
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return date >= thirtyDaysAgo
          }).length,
          fraudClaims,
          totalClaimed,
          totalApproved,
        },
        serviceTypes,
      },
    })
  } catch (error) {
    console.error("[v0] Error in GET /api/members/[id]/profile:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}