"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FileText, Clock, CheckCircle, XCircle, DollarSign,
  Building2, Users, Activity, Loader2, AlertCircle,
} from "lucide-react"

interface ClaimStats {
  totalClaims: number
  approvedClaims: number
  pendingClaims: number
  rejectedClaims: number
  underReviewClaims: number
  totalClaimed: number
  totalApproved: number
}

interface ProviderGroup {
  facilityCode: string
  facilityName: string
  count: number
  totalCharged: number
  approved: number
  pending: number
}

export default function StatsPage() {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<{ memberId: string; type: string } | null>(null)
  const [stats, setStats] = useState<ClaimStats | null>(null)
  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"user" | "hospital">("user")

  useEffect(() => {
    const stored = sessionStorage.getItem("claimsGuardUser")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    setUserInfo(user)
    loadStats(user.memberId)
  }, [router])

  const loadStats = async (memberId: string) => {
    setLoading(true)
    setError(null)
    try {
      const statsRes = await fetch(`/api/claims/stats/${encodeURIComponent(memberId)}`)
      if (!statsRes.ok) throw new Error(`HTTP ${statsRes.status}`)
      const statsJson = await statsRes.json()
      if (!statsJson.success) throw new Error(statsJson.message || "Failed to load stats")
      setStats(statsJson.data)

      const claimsRes = await fetch(`/api/claims?memberId=${encodeURIComponent(memberId)}&limit=200`)
      if (claimsRes.ok) {
        const claimsJson = await claimsRes.json()
        if (claimsJson.success && Array.isArray(claimsJson.data)) {
          const groups: Record<string, ProviderGroup> = {}
          for (const c of claimsJson.data) {
            const code = c.provider?.facility_code ?? "Unknown"
            const name = c.provider?.facility_name ?? code
            if (!groups[code]) {
              groups[code] = { facilityCode: code, facilityName: name, count: 0, totalCharged: 0, approved: 0, pending: 0 }
            }
            groups[code].count++
            groups[code].totalCharged += Number(c.total_billed) || 0
            if (c.status === "APPROVED") groups[code].approved++
            if (c.status === "PENDING" || c.status === "UNDER_REVIEW") groups[code].pending++
          }
          setProviderGroups(Object.values(groups).sort((a, b) => b.count - a.count))
        }
      }
    } catch (err) {
      console.error("Stats load error:", err)
      setError("Could not load statistics. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) =>
    `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`

  const total = stats?.totalClaims ?? 0
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading statistics…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statCards = [
    { title: "Total Claims",  value: stats?.totalClaims ?? 0,    icon: FileText,    color: "text-primary",   bg: "bg-primary/10" },
    { title: "Pending",       value: stats?.pendingClaims ?? 0,   icon: Clock,       color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Approved",      value: stats?.approvedClaims ?? 0,  icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Rejected",      value: stats?.rejectedClaims ?? 0,  icon: XCircle,     color: "text-red-500",   bg: "bg-red-500/10" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Claims Statistics</h1>
          <p className="text-muted-foreground mt-1">Overview of your claims activity</p>
        </div>
        <Select value={viewMode} onValueChange={(v: "user" | "hospital") => setViewMode(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">
              <div className="flex items-center gap-2"><Users className="w-4 h-4" />By Member</div>
            </SelectItem>
            <SelectItem value="hospital">
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4" />By Hospital</div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{s.title}</p>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Financial Summary
              </CardTitle>
              <CardDescription>Total amounts across all claims</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Charged</span>
                  <span className="text-xl font-bold text-foreground">{fmt(stats?.totalClaimed ?? 0)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-full bg-primary rounded-full w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Approved</span>
                  <span className="text-xl font-bold text-green-600">{fmt(stats?.totalApproved ?? 0)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: stats?.totalClaimed
                        ? `${Math.min(100, ((stats.totalApproved ?? 0) / stats.totalClaimed) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="text-muted-foreground">Approval Rate</span>
                <span className="text-lg font-medium">{pct(stats?.approvedClaims ?? 0)}%</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Claims Activity
              </CardTitle>
              <CardDescription>Status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Pending Review", value: stats?.pendingClaims ?? 0,      color: "bg-amber-500" },
                  { label: "Under Review",   value: stats?.underReviewClaims ?? 0,  color: "bg-blue-500" },
                  { label: "Approved",       value: stats?.approvedClaims ?? 0,     color: "bg-green-500" },
                  { label: "Rejected",       value: stats?.rejectedClaims ?? 0,     color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct(item.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {viewMode === "hospital" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Claims by Healthcare Provider
              </CardTitle>
              <CardDescription>Total claims submitted to each provider</CardDescription>
            </CardHeader>
            <CardContent>
              {providerGroups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No claims data available</p>
              ) : (
                <div className="space-y-4">
                  {providerGroups.map((p) => (
                    <div
                      key={p.facilityCode}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.facilityName}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.count} claim{p.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{fmt(p.totalCharged)}</p>
                        <p className="text-xs text-muted-foreground">Total charged</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}