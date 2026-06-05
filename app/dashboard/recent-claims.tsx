"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export interface RecentClaimsHandle {
  refresh: () => void
}

interface Claim {
  id: string
  claim_number: string
  service_date: string
  diagnosis_desc: string
  service_type: string
  total_billed: number
  status: string
  fraud_label: string
  fraud_score: number
}

export const RecentClaims = forwardRef<RecentClaimsHandle, {}>((_, ref) => {
  const { user, loading } = useAuth()
  const [claims, setClaims] = useState<Claim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClaims = useCallback(async () => {
    if (!user?.id) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/claims?memberId=${user.id}&limit=10&page=1`)
      const json = await response.json()

      if (!json.success) {
        setError(json.message || "Failed to load claims")
        setClaims([])
        return
      }

      setClaims(json.data)
      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching claims:", err)
      setError("Failed to load claims")
      setClaims([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useImperativeHandle(ref, () => ({ refresh: fetchClaims }), [fetchClaims])

  useEffect(() => {
    if (!loading && user?.id) {
      fetchClaims()
    }
  }, [loading, user?.id, fetchClaims])

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        fetchClaims()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [user?.id, fetchClaims])

  if (loading || isLoading) {
    return <div className="text-slate-400">Loading claims...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (claims.length === 0) {
    return <div className="text-slate-400">No claims found</div>
  }

  return (
    <div className="space-y-2">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="bg-slate-800 rounded-lg p-4 border border-slate-700"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-white">{claim.claim_number}</p>
              <p className="text-sm text-slate-400">{claim.diagnosis_desc}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-cyan-400">
                KSh {Number(claim.total_billed).toLocaleString()}
              </p>
              <p
                className={`text-xs ${
                  claim.status === "APPROVED"
                    ? "text-green-400"
                    : claim.status === "PENDING"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {claim.status}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

RecentClaims.displayName = "RecentClaims"
