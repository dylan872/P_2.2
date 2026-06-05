"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Users,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Medal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface ProviderReport {
  id: string
  facility_code: string
  facility_name: string
  facility_type: string
  county: string
  total_claims: number
  total_amount: number
  fraud_count: number
  suspicious_count: number
  valid_count: number
  fraud_rate: number
  risk_level: "HIGH" | "MEDIUM" | "LOW"
}

interface MemberReport {
  id: string
  member_number: string
  full_name: string
  total_claims: number
  total_amount: number
  fraud_count: number
  suspicious_count: number
  fraud_rate: number
  risk_level: "HIGH" | "MEDIUM" | "LOW"
}

export default function ReportsPage() {
  // const [providers, setProviders] = useState<ProviderReport[]>([])
  // const [members, setMembers] = useState<MemberReport[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("providers")

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/admin/reports")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProviders(data.data.providers)
          setMembers(data.data.members)
        }
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "HIGH":
        return <Badge variant="destructive">High Risk</Badge>
      case "MEDIUM":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Medium Risk</Badge>
      default:
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Low Risk</Badge>
    }
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Medal className="w-5 h-5 text-red-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-amber-500" />
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Fraud Analytics Reports</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive analysis of fraud patterns across providers and members
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High-Risk Providers</p>
                <p className="text-2xl font-bold text-foreground">
                  {(providers ?? []).filter(p => p.risk_level === "HIGH").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High-Risk Members</p>
                <p className="text-2xl font-bold text-foreground">
                  {members.filter(m => m.risk_level === "HIGH").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Provider Fraud Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {providers.length > 0
                    ? (providers.reduce((acc, p) => acc + p.fraud_rate, 0) / providers.length).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Flagged Amount</p>
                <p className="text-2xl font-bold text-foreground">
                  KSh {providers.reduce((acc, p) => acc + (p.fraud_count * 50000), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Provider and Member Rankings */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="providers" className="gap-2">
            <Building2 className="w-4 h-4" />
            Provider Rankings
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Member Rankings
          </TabsTrigger>
        </TabsList>

        {/* Provider Rankings */}
        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Healthcare Provider Fraud Rankings
              </CardTitle>
              <CardDescription>
                Providers ranked by fraud score (combination of fraud rate and total flagged claims)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider, index) => (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${
                      provider.risk_level === "HIGH"
                        ? "border-red-500/30 bg-red-500/5"
                        : provider.risk_level === "MEDIUM"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {getRankIcon(index)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {provider.facility_name}
                            </p>
                            {getRiskBadge(provider.risk_level)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {provider.facility_type} | {provider.county}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-2xl font-bold text-foreground">
                            {provider.fraud_rate.toFixed(1)}%
                          </span>
                          {provider.fraud_rate > 30 ? (
                            <ArrowUpRight className="w-5 h-5 text-red-500" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {provider.fraud_count} flagged / {provider.total_claims} total
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Fraud Rate</span>
                        <span>{provider.fraud_rate.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={provider.fraud_rate}
                        className={`h-2 ${
                          provider.risk_level === "HIGH"
                            ? "[&>div]:bg-red-500"
                            : provider.risk_level === "MEDIUM"
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-emerald-500"
                        }`}
                      />
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">Fraudulent: {provider.fraud_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">Suspicious: {provider.suspicious_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">Valid: {provider.valid_count}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {providers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No provider data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Rankings */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Member Fraud Risk Rankings
              </CardTitle>
              <CardDescription>
                Members ranked by fraud risk score based on claim history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${
                      member.risk_level === "HIGH"
                        ? "border-red-500/30 bg-red-500/5"
                        : member.risk_level === "MEDIUM"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {getRankIcon(index)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {member.full_name}
                            </p>
                            {getRiskBadge(member.risk_level)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.member_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-2xl font-bold text-foreground">
                            {member.fraud_rate.toFixed(1)}%
                          </span>
                          {member.fraud_rate > 30 ? (
                            <ArrowUpRight className="w-5 h-5 text-red-500" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.fraud_count + member.suspicious_count} flagged / {member.total_claims} total
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Risk Score</span>
                        <span>{member.fraud_rate.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={member.fraud_rate}
                        className={`h-2 ${
                          member.risk_level === "HIGH"
                            ? "[&>div]:bg-red-500"
                            : member.risk_level === "MEDIUM"
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-emerald-500"
                        }`}
                      />
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Claims: {member.total_claims}
                      </span>
                      <span className="text-muted-foreground">
                        Total Amount: KSh {member.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No member data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
