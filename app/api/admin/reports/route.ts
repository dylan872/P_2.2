import { query } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Fetch provider fraud rankings with full shape the page expects
    const providersResult = await query<{
      id: string
      facility_code: string
      facility_name: string
      facility_type: string
      county: string
      total_claims: string
      total_amount: string
      fraud_count: string
      suspicious_count: string
      valid_count: string
      fraud_rate: string
    }>(`
      SELECT
        p.id,
        p.facility_code,
        p.facility_name,
        p.facility_type,
        p.county,
        COUNT(c.id) as total_claims,
        COALESCE(SUM(c.total_billed), 0) as total_amount,
        COUNT(CASE WHEN c.fraud_label = 'FRAUDULENT' THEN 1 END) as fraud_count,
        COUNT(CASE WHEN c.fraud_label = 'SUSPICIOUS' THEN 1 END) as suspicious_count,
        COUNT(CASE WHEN c.fraud_label = 'VALID' THEN 1 END) as valid_count,
        COALESCE(
          ROUND(
            100.0 * COUNT(CASE WHEN c.fraud_label = 'FRAUDULENT' THEN 1 END)
            / NULLIF(COUNT(c.id), 0), 1
          ), 0
        ) as fraud_rate
      FROM providers p
      LEFT JOIN claims c ON c.provider_id = p.id
      GROUP BY p.id, p.facility_code, p.facility_name, p.facility_type, p.county
      ORDER BY fraud_rate DESC NULLS LAST
    `)

    // Fetch member fraud rankings with full shape the page expects
    const membersResult = await query<{
      id: string
      member_number: string
      full_name: string
      total_claims: string
      total_amount: string
      fraud_count: string
      suspicious_count: string
      fraud_rate: string
    }>(`
      SELECT
        m.id,
        m.member_number,
        m.full_name,
        COUNT(c.id) as total_claims,
        COALESCE(SUM(c.total_billed), 0) as total_amount,
        COUNT(CASE WHEN c.fraud_label = 'FRAUDULENT' THEN 1 END) as fraud_count,
        COUNT(CASE WHEN c.fraud_label = 'SUSPICIOUS' THEN 1 END) as suspicious_count,
        COALESCE(
          ROUND(
            100.0 * COUNT(CASE WHEN c.fraud_label IN ('FRAUDULENT','SUSPICIOUS') THEN 1 END)
            / NULLIF(COUNT(c.id), 0), 1
          ), 0
        ) as fraud_rate
      FROM members m
      LEFT JOIN claims c ON c.member_id = m.id
      GROUP BY m.id, m.member_number, m.full_name
      HAVING COUNT(CASE WHEN c.fraud_label IN ('FRAUDULENT','SUSPICIOUS') THEN 1 END) > 0
      ORDER BY fraud_rate DESC
    `)

    // Helper to compute risk level
    const getRiskLevel = (fraudRate: number): "HIGH" | "MEDIUM" | "LOW" => {
      if (fraudRate >= 50) return "HIGH"
      if (fraudRate >= 20) return "MEDIUM"
      return "LOW"
    }

    const providers = providersResult.rows.map(p => ({
      id: p.id,
      facility_code: p.facility_code,
      facility_name: p.facility_name,
      facility_type: p.facility_type,
      county: p.county,
      total_claims: parseInt(p.total_claims),
      total_amount: parseFloat(p.total_amount),
      fraud_count: parseInt(p.fraud_count),
      suspicious_count: parseInt(p.suspicious_count),
      valid_count: parseInt(p.valid_count),
      fraud_rate: parseFloat(p.fraud_rate),
      risk_level: getRiskLevel(parseFloat(p.fraud_rate)),
    }))

    const members = membersResult.rows.map(m => ({
      id: m.id,
      member_number: m.member_number,
      full_name: m.full_name,
      total_claims: parseInt(m.total_claims),
      total_amount: parseFloat(m.total_amount),
      fraud_count: parseInt(m.fraud_count),
      suspicious_count: parseInt(m.suspicious_count),
      fraud_rate: parseFloat(m.fraud_rate),
      risk_level: getRiskLevel(parseFloat(m.fraud_rate)),
    }))

    return NextResponse.json({
      success: true,
      data: {
        providers,
        members,
      },
    })
  } catch (error) {
    console.error("[Admin Reports Error]", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}