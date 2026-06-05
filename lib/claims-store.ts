"use client"

import { ExtractedClaimData } from "./claim-schema"

export interface StoredClaim {
  id: string
  fileName: string
  extractedData: ExtractedClaimData
  confidence: number
  uploadedAt: Date
  submittedAt?: Date
  status: "pending" | "submitted" | "approved" | "rejected"
  uploadedBy: {
    memberId: string
    type: "user" | "hospital" | "admin"
  }
}

// In-memory store
let claimsStore: StoredClaim[] = []

export function addClaim(claim: StoredClaim) {
  claimsStore.push(claim)
}

export function getClaims(): StoredClaim[] {
  return claimsStore
}

export function getClaimsByUser(memberId: string): StoredClaim[] {
  return claimsStore.filter((claim) => claim.uploadedBy.memberId === memberId)
}

export function getClaimsByHospital(facilityCode: string): StoredClaim[] {
  return claimsStore.filter(
    (claim) => claim.extractedData.facilityCode === facilityCode
  )
}

export function getClaimStats(memberId?: string, hospitalFacilityCode?: string) {
  let filteredClaims = claimsStore

  if (memberId) {
    filteredClaims = filteredClaims.filter(
      (claim) => claim.uploadedBy.memberId === memberId
    )
  }

  if (hospitalFacilityCode) {
    filteredClaims = filteredClaims.filter(
      (claim) => claim.extractedData.facilityCode === hospitalFacilityCode
    )
  }

  const totalClaims = filteredClaims.length
  const pendingClaims = filteredClaims.filter((c) => c.status === "pending").length
  const submittedClaims = filteredClaims.filter((c) => c.status === "submitted").length
  const approvedClaims = filteredClaims.filter((c) => c.status === "approved").length
  const rejectedClaims = filteredClaims.filter((c) => c.status === "rejected").length

  const totalCharges = filteredClaims.reduce(
    (sum, claim) => sum + (claim.extractedData.totalBilled || 0),
    0
  )

  return {
    totalClaims,
    pendingClaims,
    submittedClaims,
    approvedClaims,
    rejectedClaims,
    totalCharges,
  }
}

export function clearClaims() {
  claimsStore = []
}