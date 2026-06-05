"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

interface DashboardStatsData {
  totalClaims: number
  pendingClaims: number
  approvedClaims: number
  rejectedClaims: number
  totalBilled: number
  totalApproved: number
}

export function DashboardStats() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    if (!user?.id) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/claims/stats/${user.id}`)
      const json = await response.json()

      if (!json.success) {
        setError(json.message || "Failed to load statistics")
        setStats(null)
        return
      }

      setStats(json.data)
      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching stats:", err)
      setError("Failed to load statistics")
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user?.id) {
      fetchStats()
    }
  }, [loading, user?.id])

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        fetchStats()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [user?.id])

  if (loading || isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (!stats) {
    return <div className="text-gray-400">No data available</div>
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Claims" value={stats.totalClaims} />
      <StatCard label="Pending" value={stats.pendingClaims} />
      <StatCard label="Approved" value={stats.approvedClaims} />
      <StatCard label="Rejected" value={stats.rejectedClaims} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-cyan-500 mt-2">{value}</p>
    </div>
  )
}
