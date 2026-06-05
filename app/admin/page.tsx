"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  FileWarning,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Building2,
  Users,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Scale,
  Wallet,
  PieChart,
  BarChart3,
  Activity,
} from "lucide-react"

interface DashboardStats {
  totalClaims: number
  validClaims: number
  suspiciousClaims: number
  fraudulentClaims: number
  totalAmount: number
  flaggedAmount: number
  avgFraudScore: number
  topFraudProviders: Array<{
    facility_name: string
    fraud_count: number
    total_claims: number
    fraud_rate: number
  }>
  recentFraudulent: Array<{
    id: string
    claim_number: string
    member_name: string
    fraud_score: number
    total_billed: number
    created_at: string
  }>
  claimsByStatus: Array<{ status: string; count: number }>
  claimsByServiceType: Array<{ service_type: string; count: number }>
  fraudTrend: Array<{ date: string; count: number; avg_score: number }>
  premiumStats: {
    totalMembers: number
    activePremium: number
    inactivePremium: number
    pendingPremium: number
    totalRevenue: number
  }
  totalWalletsBalance: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard-stats")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS: Record<string, string> = {
    PENDING: "bg-amber-500",
    APPROVED: "bg-emerald-500",
    REJECTED: "bg-red-500",
    FLAGGED: "bg-orange-500",
    UNDER_REVIEW: "bg-blue-500",
    CLOSED: "bg-gray-500",
    OUTPATIENT: "bg-blue-500",
    INPATIENT: "bg-purple-500",
    EMERGENCY: "bg-red-500",
    DENTAL: "bg-teal-500",
    OPTICAL: "bg-cyan-500",
    MATERNITY: "bg-pink-500",
    SURGICAL: "bg-indigo-500",
  }

  const BarChart = ({ data, maxValue, height = 180 }: { data: Array<{ label: string; value: number }>, maxValue?: number, height?: number }) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1)
    return (
      <div className="space-y-2" style={{ minHeight: height }}>
        {data.map((item, i) => {
          const pct = (item.value / max) * 100
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 truncate text-right">{item.label}</span>
              <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: COLORS[item.label] || "#3b82f6" }}
                />
                <span className="absolute right-2 top-0 bottom-0 flex items-center text-xs font-medium text-foreground">
                  {item.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  const fraudRate = stats
    ? ((stats.suspiciousClaims + stats.fraudulentClaims) / stats.totalClaims) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor fraud detection, wallets, and premium status
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/claims">
            <Button variant="destructive" className="gap-2">
              <FileWarning className="w-4 h-4" />
              Review Flagged Claims
            </Button>
          </Link>
          <Link href="/admin/wallets">
            <Button variant="outline" className="gap-2">
              <Wallet className="w-4 h-4" />
              Wallets
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Claims</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.totalClaims || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valid Claims</p>
                  <p className="text-3xl font-bold text-emerald-500">{stats?.validClaims || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suspicious</p>
                  <p className="text-3xl font-bold text-amber-500">{stats?.suspiciousClaims || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fraudulent</p>
                  <p className="text-3xl font-bold text-red-500">{stats?.fraudulentClaims || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <FileWarning className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Wallet & Premiums Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Wallet Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    KSh {(stats?.totalWalletsBalance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Premiums</p>
                  <p className="text-xl font-bold text-foreground">{stats?.premiumStats?.activePremium || 0}</p>
                  <p className="text-xs text-muted-foreground">of {stats?.premiumStats?.totalMembers || 0} members</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Premium Revenue</p>
                  <p className="text-xl font-bold text-foreground">
                    KSh {(stats?.premiumStats?.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">KSh 5,000/member/month</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive Premiums</p>
                  <p className="text-xl font-bold text-red-500">{stats?.premiumStats?.inactivePremium || 0}</p>
                  <p className="text-xs text-muted-foreground">{stats?.premiumStats?.pendingPremium || 0} pending</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Financial Overview
              </CardTitle>
              <CardDescription>Total claims value and flagged amounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Claims Value</span>
                  <span className="font-semibold">KSh {(stats?.totalAmount || 0).toLocaleString()}</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Flagged Amount</span>
                  <span className="font-semibold text-red-500">KSh {(stats?.flaggedAmount || 0).toLocaleString()}</span>
                </div>
                <Progress
                  value={stats ? (stats.flaggedAmount / stats.totalAmount) * 100 : 0}
                  className="h-2 [&>div]:bg-red-500"
                />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overall Fraud Rate</span>
                  <Badge variant={fraudRate > 20 ? "destructive" : fraudRate > 10 ? "secondary" : "default"} className="text-sm">
                    {fraudRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                High-Risk Providers
              </CardTitle>
              <CardDescription>Hospitals with highest fraud rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topFraudProviders?.slice(0, 4).map((provider, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-red-500/10 text-red-500"
                            : index === 1
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{provider.facility_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {provider.fraud_count} flagged / {provider.total_claims} total
                        </p>
                      </div>
                    </div>
                    <Badge variant={provider.fraud_rate > 50 ? "destructive" : "secondary"} className="text-xs">
                      {provider.fraud_rate.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
                {(!stats?.topFraudProviders || stats.topFraudProviders.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No high-risk providers detected</p>
                )}
              </div>
              <Link href="/admin/reports">
                <Button variant="ghost" className="w-full mt-4 gap-2">
                  View Full Report <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Flagged Claims */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Recent Flagged Claims
            </CardTitle>
            <CardDescription>Latest claims flagged for review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentFraudulent?.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <FileWarning className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{claim.claim_number}</p>
                      <p className="text-sm text-muted-foreground">{claim.member_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">KSh {claim.total_billed.toLocaleString()}</p>
                      <Badge variant="destructive" className="text-xs">Score: {claim.fraud_score}%</Badge>
                    </div>
                    <Link href={`/admin/claims/${claim.id}`}>
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>
                </div>
              ))}
              {(!stats?.recentFraudulent || stats.recentFraudulent.length === 0) && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/50 mb-2" />
                  <p className="text-muted-foreground">No flagged claims to review</p>
                </div>
              )}
            </div>
            <Link href="/admin/claims">
              <Button variant="ghost" className="w-full mt-4 gap-2">
                View All Flagged Claims <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Legal Compliance Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-red-500/5">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Legal Compliance Reminder</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Healthcare fraud is a serious offense under Kenya&apos;s Anti-Corruption and
                    Economic Crimes Act. Review the legal framework for proper claim processing.
                  </p>
                </div>
              </div>
              <Link href="/admin/compliance">
                <Button variant="outline" className="gap-2 whitespace-nowrap">
                  <Scale className="w-4 h-4" /> View Legal Framework
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Claims by Status
              </CardTitle>
              <CardDescription>Distribution of all claims by adjudication status</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.claimsByStatus && stats.claimsByStatus.length > 0 ? (
                <BarChart
                  data={stats.claimsByStatus.map(s => ({ label: s.status, value: s.count }))}
                  maxValue={Math.max(...(stats.claimsByStatus.map(s => s.count) || [1]))}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                Claims by Service Type
              </CardTitle>
              <CardDescription>Volume of claims per service category</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.claimsByServiceType && stats.claimsByServiceType.length > 0 ? (
                <BarChart
                  data={stats.claimsByServiceType.map(s => ({ label: s.service_type, value: s.count }))}
                  maxValue={Math.max(...(stats.claimsByServiceType.map(s => s.count) || [1]))}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.73 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                Fraud Trend (30 Days)
              </CardTitle>
              <CardDescription>Daily non-valid claims and average fraud score</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.fraudTrend && stats.fraudTrend.length > 0 ? (
                <div className="space-y-1">
                  {stats.fraudTrend.slice(0, 7).map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</span>
                      <span className="text-xs font-medium">
                        {t.count} claim{t.count !== 1 ? "s" : ""} · avg score {t.avg_score}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No fraud trends this period</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
