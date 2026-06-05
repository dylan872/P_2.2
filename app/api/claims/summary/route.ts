import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get total counts by fraud_label
    const { data: labelCounts, error: labelError } = await supabase
      .from("claims")
      .select("fraud_label")

    if (labelError) {
      console.error("Error fetching label counts:", labelError)
      return NextResponse.json(
        { success: false, message: "Failed to fetch summary" },
        { status: 500 }
      )
    }

    // Get total counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from("claims")
      .select("status")

    if (statusError) {
      console.error("Error fetching status counts:", statusError)
      return NextResponse.json(
        { success: false, message: "Failed to fetch summary" },
        { status: 500 }
      )
    }

    // Get financial totals
    const { data: financials, error: financialError } = await supabase
      .from("claims")
      .select("total_billed, approved_amount")

    if (financialError) {
      console.error("Error fetching financials:", financialError)
      return NextResponse.json(
        { success: false, message: "Failed to fetch summary" },
        { status: 500 }
      )
    }

    const total = labelCounts?.length || 0
    const valid = labelCounts?.filter((c) => c.fraud_label === "VALID").length || 0
    const suspicious = labelCounts?.filter((c) => c.fraud_label === "SUSPICIOUS").length || 0
    const fraudulent = labelCounts?.filter((c) => c.fraud_label === "FRAUDULENT").length || 0
    const pending = statusCounts?.filter((c) => c.status === "PENDING").length || 0

    const totalBilled = financials?.reduce((sum, c) => sum + parseFloat(c.total_billed || "0"), 0) || 0
    const totalApproved = financials?.reduce((sum, c) => sum + parseFloat(c.approved_amount || "0"), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        total,
        valid,
        suspicious,
        fraudulent,
        pending,
        validPercent: total > 0 ? Math.round((valid / total) * 100 * 10) / 10 : 0,
        suspiciousPercent: total > 0 ? Math.round((suspicious / total) * 100 * 10) / 10 : 0,
        fraudulentPercent: total > 0 ? Math.round((fraudulent / total) * 100 * 10) / 10 : 0,
        totalBilled,
        totalApproved,
        totalSaved: totalBilled - totalApproved,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/claims/summary:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
