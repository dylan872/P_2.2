// API client for Claims Guard backend
// Configure this with your actual backend URL

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

// Type exports for profile page
export interface MemberProfile {
  id: string
  memberNumber: string
  nationalId: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: string
  phoneNumber: string | null
  address?: string | null
  insurerType: string
  policyNumber: string | null
  coverStatus: string
  coverExpiry: string | null
  isInsured: boolean
  statusMessage: string
  daysToExpiry: number | null
  profilePicture: string | null
}

export interface MemberClaimStats {
  totalClaims: number
  approvedClaims: number
  totalClaimed: number
  totalApproved: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Get auth token from session storage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  const user = sessionStorage.getItem("claimsGuardUser")
  if (user) {
    const parsed = JSON.parse(user)
    return parsed.token || null
  }
  return null
}

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken()
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Auth API - matches backend /api/auth routes
export const authApi = {
  // Member login using memberNumber and nationalId
  memberLogin: async (memberNumber: string, nationalId: string) => {
    return apiFetch<{
      token: string
      refreshToken: string
      member: {
        id: string
        memberNumber: string
        nationalId: string
        fullName: string
        dateOfBirth: string
        gender: string
        phoneNumber: string | null
        insurerType: string
        coverStatus: string
        coverExpiry: string | null
        profilePicture: string | null
        role: string // "user" | "hospital" | "admin"
      }
    }>("/auth/member-login", {
      method: "POST",
      body: JSON.stringify({ memberNumber, nationalId }),
    })
  },

  // Admin/Staff login using email and password
  login: async (email: string, password: string) => {
    return apiFetch<{
      token: string
      refreshToken: string
      user: { id: string; email: string; fullName: string; role: string; avatar: string | null }
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  logout: async () => {
    return apiFetch<{ message: string }>("/auth/logout", { method: "POST" })
  },

  register: async (data: { email: string; password: string; fullName: string; role?: string }) => {
    return apiFetch<{
      token: string
      refreshToken: string
      user: { id: string; email: string; fullName: string; role: string }
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  refresh: async (refreshToken: string) => {
    return apiFetch<{
      token: string
      refreshToken: string
      user: { id: string; email: string; fullName: string; role: string }
    }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    })
  },

  me: async () => {
    return apiFetch<{ id: string; email: string; fullName: string; role: string; avatar: string | null }>(
      "/auth/me"
    )
  },
}

// Claims API
export const claimsApi = {
  list: async (params?: {
    page?: number
    limit?: number
    status?: string
    fraudLabel?: string
    memberId?: string
    providerId?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    const query = searchParams.toString()
    return apiFetch<PaginatedResponse<import("./claim-schema").ClaimData>>(
      `/claims${query ? `?${query}` : ""}`
    )
  },

  get: async (id: string) => {
    return apiFetch<import("./claim-schema").ClaimData>(`/claims/${id}`)
  },

  create: async (data: import("./claim-schema").SubmitClaimRequest) => {
    return apiFetch<{ id: string; claimNumber: string; status: string; message: string }>(
      "/claims",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )
  },

  updateStatus: async (
    id: string,
    data: {
      status: string
      rejectionReason?: string
      approvedAmount?: number
      notes?: string
    }
  ) => {
    return apiFetch<import("./claim-schema").ClaimData>(`/claims/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  summary: async (params?: { dateFrom?: string; dateTo?: string }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    const query = searchParams.toString()
    return apiFetch<{
      total: number
      valid: number
      suspicious: number
      fraudulent: number
      pending: number
      validPercent: number
      suspiciousPercent: number
      fraudulentPercent: number
      totalBilled: number
      totalApproved: number
      totalSaved: number
    }>(`/claims/summary${query ? `?${query}` : ""}`)
  },
}

// Members API
export const membersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    const query = searchParams.toString()
    return apiFetch<PaginatedResponse<import("./claim-schema").MemberData>>(
      `/members${query ? `?${query}` : ""}`
    )
  },

  get: async (id: string) => {
    return apiFetch<import("./claim-schema").MemberData & { claims: import("./claim-schema").ClaimData[] }>(
      `/members/${id}`
    )
  },

  getProfile: async (id: string) => {
    return apiFetch<{
      profile: {
        id: string
        memberNumber: string
        nationalId: string
        fullName: string
        dateOfBirth: string
        age: number
        gender: string
        phoneNumber: string | null
        address: string | null
        insurerType: string
        policyNumber: string | null
        coverStatus: string
        coverExpiry: string | null
        isInsured: boolean
        statusMessage: string
        daysToExpiry: number | null
        profilePicture: string | null
      }
      medicalHistory: Array<{
        id: string
        claimNumber: string
        serviceDate: string
        diagnosisDesc: string
        serviceType: string
        totalBilled: number
        approvedAmount: number | null
        status: string
        fraudLabel: string
        fraudScore: number
        flagCount: number
        flags: Array<{ flagType: string; severity: string }>
      }>
      riskAssessment: {
        riskLevel: string
        reasons: string[]
        totalClaims: number
        recentClaims: number
        fraudClaims: number
        totalClaimed: number
        totalApproved: number
      }
      serviceTypes: string[]
    }>(`/members/${id}/profile`)
  },

  getRisk: async (id: string) => {
    return apiFetch<{
      isInsured: boolean
      isHighRisk: boolean
      riskAssessment: {
        riskLevel: string
        reasons: string[]
        totalClaims: number
        recentClaims: number
        fraudClaims: number
        totalClaimed: number
        totalApproved: number
      }
    }>(`/members/${id}/risk`)
  },

  create: async (data: Omit<import("./claim-schema").MemberData, "id" | "createdAt">) => {
    return apiFetch<import("./claim-schema").MemberData>("/members", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateStatus: async (id: string, coverStatus: string) => {
    return apiFetch<import("./claim-schema").MemberData>(`/members/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ coverStatus }),
    })
  },

  updateProfile: async (id: string, data: Partial<import("./claim-schema").MemberData>) => {
    return apiFetch<import("./claim-schema").MemberData>(`/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  updateProfilePicture: async (id: string, imageBase64: string) => {
    return apiFetch<{ profilePicture: string }>(`/members/${id}/profile-picture`, {
      method: "PATCH",
      body: JSON.stringify({ profilePicture: imageBase64 }),
    })
  },

  getClaimStats: async (memberId: string): Promise<MemberClaimStats> => {
    // Backend route is /claims/stats/:memberId not /members/:id/claim-stats
    const response = await apiFetch<{
      totalClaims: number
      approvedClaims: number
      totalClaimed: number
      totalApproved: number
    }>(`/claims/stats/${memberId}`)
    return response.data
  },
}

// Providers API
export const providersApi = {
  list: async (params?: {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    const query = searchParams.toString()
    return apiFetch<PaginatedResponse<import("./claim-schema").ProviderData>>(
      `/providers${query ? `?${query}` : ""}`
    )
  },

  get: async (id: string) => {
    return apiFetch<
      import("./claim-schema").ProviderData & {
        claims: Array<import("./claim-schema").ClaimData & { member: { fullName: string } }>
      }
    >(`/providers/${id}`)
  },

  create: async (data: Omit<import("./claim-schema").ProviderData, "id" | "totalClaims" | "flaggedClaims" | "fraudScore">) => {
    return apiFetch<import("./claim-schema").ProviderData>("/providers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateAccreditation: async (id: string, isAccredited: boolean) => {
    return apiFetch<import("./claim-schema").ProviderData>(`/providers/${id}/accreditation`, {
      method: "PATCH",
      body: JSON.stringify({ isAccredited }),
    })
  },
}
