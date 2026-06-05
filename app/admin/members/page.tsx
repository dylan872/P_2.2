"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Wallet, Search, Users, Eye, ArrowUpRight, FileText, Loader2 } from "lucide-react"
import { formatKSH } from "@/lib/claim-schema"

interface MemberRow {
  id: string
  member_number: string
  full_name: string
  insurer_type: string
  cover_status: string
  wallet_balance: number
  pending_claims_count: number
  pending_reimbursement: number
  projected_balance: number
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null)
  const [walletDetail, setWalletDetail] = useState<{ transactions: Array<{ description: string; amount: number; created_at: string }>; pendingClaims: Array<{ claim_number: string; total_billed: number; status: string }> } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [statusFilter])

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      const response = await fetch(`/api/admin/members?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMembers(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch members:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewMember = async (member: MemberRow) => {
    setSelectedMember(member)
    setLoadingDetail(true)
    setWalletDetail(null)
    try {
      const res = await fetch(`/api/members/${member.id}/wallet`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setWalletDetail({
            transactions: json.data.transactions || [],
            pendingClaims: json.data.pendingClaims || [],
          })
        }
      }
    } catch {
      console.error("Failed to fetch wallet detail")
    } finally {
      setLoadingDetail(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "SUSPENDED":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Suspended</Badge>
      case "EXPIRED":
      case "INACTIVE":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.member_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Members
        </h1>
        <p className="text-muted-foreground mt-1">
          Member wallet balances and pending claim reimbursements
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or member number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Cover status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No members found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">{member.member_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(member.cover_status)}
                          <span className="text-xs text-muted-foreground">{member.insurer_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-lg font-bold text-emerald-600">
                          KSh {member.wallet_balance.toLocaleString()}
                        </p>
                        {member.pending_claims_count > 0 && (
                          <p className="text-xs text-blue-500">
                            +{member.pending_claims_count} pending → KSh {member.pending_reimbursement.toLocaleString()}
                          </p>
                        )}
                        {member.pending_claims_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Projected: <span className="font-medium text-foreground">KSh {member.projected_balance.toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleViewMember(member)}
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => { if (!open) { setSelectedMember(null); setWalletDetail(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              {selectedMember?.full_name}
            </DialogTitle>
            <DialogDescription>
              {selectedMember?.member_number} · {selectedMember?.insurer_type}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    KSh {selectedMember.wallet_balance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                </div>
                <div className="bg-blue-500/5 rounded-lg p-4 text-center border border-blue-500/20">
                  <p className="text-2xl font-bold text-blue-600">
                    KSh {selectedMember.pending_reimbursement.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending Reimbursement</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4 text-center border border-primary/20">
                  <p className="text-2xl font-bold text-foreground">
                    KSh {selectedMember.projected_balance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Projected Balance</p>
                </div>
              </div>

              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : walletDetail ? (
                <>
                  {walletDetail.pendingClaims.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Pending Claims</p>
                      {walletDetail.pendingClaims.map((claim, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">{claim.claim_number}</span>
                            <Badge variant="secondary" className="text-xs">{claim.status}</Badge>
                          </div>
                          <span className="text-sm font-semibold text-blue-600">
                            KSh {formatKSH(claim.total_billed)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {walletDetail.transactions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Recent Transactions</p>
                      {walletDetail.transactions.slice(0, 10).map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="text-sm text-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {tx.amount > 0 ? "+" : ""}KSh {formatKSH(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {walletDetail.transactions.length === 0 && walletDetail.pendingClaims.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No wallet activity yet
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Failed to load wallet details
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
