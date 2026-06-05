import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

// Enums matching backend
export const ClaimStatus = z.enum([
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "FLAGGED",
])

export const FraudLabel = z.enum(["VALID", "SUSPICIOUS", "FRAUDULENT"])

export const ServiceType = z.enum([
  "OUTPATIENT",
  "INPATIENT",
  "DAYCARE",
  "DENTAL",
  "OPTICAL",
  "MATERNITY",
  "SURGICAL",
  "EMERGENCY",
  "CHRONIC",
  "PREVENTIVE",
])

export const CoverStatus = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "EXPIRED"])

export const Gender = z.enum(["MALE", "FEMALE", "OTHER"])

export const InsurerType = z.enum(["SHA", "NHIF", "PRIVATE"])

// Line item schema
export const LineItemSchema = z.object({
  id: z.string().uuid().optional(),
  procedureCode: z.string(),
  procedureDesc: z.string(),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
  totalCost: z.number().positive(),
})

// Fraud flag schema
export const FraudFlagSchema = z.object({
  id: z.string().uuid().optional(),
  flagType: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string(),
  ruleCode: z.string().optional(),
})

// Member schema matching backend
export const MemberSchema = z.object({
  id: z.string().uuid(),
  memberNumber: z.string(),
  nationalId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string(),
  gender: Gender,
  phoneNumber: z.string().optional(),
  insurerType: InsurerType,
  policyNumber: z.string().nullable().optional(),
  coverStatus: CoverStatus,
  coverExpiry: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  profilePicture: z.string().nullable().optional(),
})

// Provider schema matching backend
export const ProviderSchema = z.object({
  id: z.string().uuid(),
  facilityCode: z.string(),
  facilityName: z.string(),
  facilityType: z.string(),
  county: z.string(),
  subCounty: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  isAccredited: z.boolean(),
  totalClaims: z.number().optional(),
  flaggedClaims: z.number().optional(),
  fraudScore: z.number().optional(),
})

// Full claim schema matching backend API
export const ClaimSchema = z.object({
  id: z.string().uuid(),
  claimNumber: z.string(),
  memberId: z.string().uuid(),
  providerId: z.string().uuid(),
  serviceDate: z.string(),
  diagnosisCode: z.string(),
  diagnosisDesc: z.string(),
  serviceType: ServiceType,
  totalBilled: z.number(),
  status: ClaimStatus,
  fraudScore: z.number().optional(),
  fraudLabel: FraudLabel.optional(),
  validationStatus: z.string().optional(),
  eligibilityChecked: z.boolean().optional(),
  eligibilityStatus: z.string().optional(),
  approvedAmount: z.number().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  submissionDate: z.string(),
  reviewedById: z.string().nullable().optional(),
  // Relations
  member: z
    .object({
      fullName: z.string(),
      memberNumber: z.string(),
    })
    .optional(),
  provider: z
    .object({
      facilityName: z.string(),
      facilityCode: z.string(),
    })
    .optional(),
  lineItems: z.array(LineItemSchema).optional(),
  fraudFlags: z.array(FraudFlagSchema).optional(),
  _count: z
    .object({
      lineItems: z.number(),
    })
    .optional(),
})

export type ClaimData = z.infer<typeof ClaimSchema>
export type MemberData = z.infer<typeof MemberSchema>
export type ProviderData = z.infer<typeof ProviderSchema>
export type LineItem = z.infer<typeof LineItemSchema>
export type FraudFlag = z.infer<typeof FraudFlagSchema>

// Submit claim request schema (for POST /api/claims)
export const SubmitClaimSchema = z.object({
  memberNumber: z.string(),
  facilityCode: z.string(),
  serviceDate: z.string(),
  diagnosisCode: z.string(),
  diagnosisDesc: z.string(),
  serviceType: ServiceType,
  totalBilled: z.number(),
  notes: z.string().optional(),
  lineItems: z.array(LineItemSchema),
})

export type SubmitClaimRequest = z.infer<typeof SubmitClaimSchema>

// Return type for extracted data
export interface ExtractedClaimData extends SubmitClaimRequest {
  rawText: string
  confidence: number
}

// Helper function to extract data from raw PDF text
export function extractClaimData(rawText: string, fileName?: string): ExtractedClaimData {
  const patterns = {
    // SHA Claim Form specific patterns
    healthProviderId: /Health\s*Provider\s*Identification\s*Number[:\s]*([A-Z0-9-]+)/i,
    facilityName: /Name\s*of\s*Health\s*Care\s*Provider\/Facility[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
    patientLastName: /Last\s*Name[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
    patientFirstName: /First\s*Name[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
    shaNumber: /Social\s*Health\s*Authority\s*Number[:\s]*([A-Z0-9-]+)/i,
    admissionDate: /Visit\/Admission\s*Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    dischargeDate: /Discharge\s*Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    diagnosisCode: /ICD-11\s*Code[:\s]*([A-Z0-9.]+)/i,
    diagnosisDesc: /Discharge\s*Diagnosis\/es[:\s]*(?:Diagnosis[:\s]*)?([A-Za-z\s,]+?)(?:\n|ICD)/i,
    billAmount: /Bill\s*Amount[:\s]*(?:Ksh\.?\s*)?([\d,]+\.?\d*)/i,
    claimAmount: /Claim\s*Amount[:\s]*(?:Ksh\.?\s*)?([\d,]+\.?\d*)/i,
    totalAmount: /Total[:\s]*(?:Ksh\.?\s*)?([\d,]+\.?\d*)/gi,
    visitType: /Visit\s*type[:\s]*.*(Inpatient|Outpatient|Day-?care)/i,
    procedureCode: /Procedure\s*Code[:\s]*([A-Z0-9-]+)/gi,
    caseCode: /Case\s*Code[:\s]*([A-Z0-9-]+)/i,
  }

  const extract = (pattern: RegExp): string | undefined => {
    const match = rawText.match(pattern)
    return match ? match[1].trim() : undefined
  }

  const extractNumber = (pattern: RegExp): number | undefined => {
    const match = rawText.match(pattern)
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ""))
      return isNaN(num) ? undefined : num
    }
    return undefined
  }

  // Extract visit type and map to service type
  const visitTypeMatch = extract(patterns.visitType)
  let serviceType: z.infer<typeof ServiceType> = "OUTPATIENT"
  if (visitTypeMatch) {
    const vt = visitTypeMatch.toUpperCase()
    if (vt.includes("INPATIENT")) serviceType = "INPATIENT"
    else if (vt.includes("DAY")) serviceType = "DAYCARE"
  }

  // Extract procedure codes for line items
  const procedureCodes = rawText.matchAll(patterns.procedureCode)
  const lineItems: LineItem[] = Array.from(procedureCodes, (m) => ({
    procedureCode: m[1],
    procedureDesc: "Procedure",
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
  }))

  // Calculate confidence
  let fieldsFound = 0
  const totalFields = 8
  
  const facilityCode = extract(patterns.healthProviderId)
  const memberNumber = extract(patterns.shaNumber)
  const diagnosisCode = extract(patterns.diagnosisCode)
  const diagnosisDesc = extract(patterns.diagnosisDesc)
  const totalBilled = extractNumber(patterns.claimAmount) || extractNumber(patterns.billAmount)
  const serviceDate = extract(patterns.admissionDate)
  
  if (facilityCode) fieldsFound++
  if (memberNumber) fieldsFound++
  if (diagnosisCode) fieldsFound++
  if (diagnosisDesc) fieldsFound++
  if (totalBilled) fieldsFound++
  if (serviceDate) fieldsFound++
  if (extract(patterns.facilityName)) fieldsFound++
  if (visitTypeMatch) fieldsFound++

  const confidence = Math.round((fieldsFound / totalFields) * 100)

  return {
    memberNumber: memberNumber || "",
    facilityCode: facilityCode || "",
    serviceDate: serviceDate || new Date().toISOString(),
    diagnosisCode: diagnosisCode || "",
    diagnosisDesc: diagnosisDesc || "",
    serviceType,
    totalBilled: totalBilled || 0,
    notes: fileName ? `Extracted from: ${fileName}` : "Extracted from uploaded document",
    lineItems: lineItems.length > 0 ? lineItems : [{ procedureCode: "UNKNOWN", procedureDesc: "General Service", quantity: 1, unitCost: totalBilled || 0, totalCost: totalBilled || 0 }],
    rawText,
    confidence,
  }
}

// Format currency in KSH
export function formatKSH(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
