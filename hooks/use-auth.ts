"use client"

import { useEffect, useState } from "react"

export interface AuthUser {
  id: string
  memberNumber: string
  fullName: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem("claimsGuardUser")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser({
          id: parsed.id,
          memberNumber: parsed.memberId || parsed.memberNumber,
          fullName: parsed.fullName,
          role: parsed.type || parsed.role || "user",
        })
      } catch (error) {
        console.error("[v0] Failed to parse stored user:", error)
      }
    }
    setLoading(false)
  }, [])

  return { user, loading }
}
