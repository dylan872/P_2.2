"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText, Search, Calendar, Building2, DollarSign,
  Eye, Filter, ChevronDown, ChevronUp, AlertCircle, Loader2,
} from "lucide-react"

interface Claim {
  id: string
  claim_number: string
  service_date: string
  service_type: string
  diagnosis_code: string
  diagnosis_desc: string
  total_billed: number
  approved_amount: number | null
  status: string
  fraud_score: number
  fraud_label: string
  notes: string
  created_at: string
  provider?: {
    facility_name: string
    facility_code: string
  }
}

type StatusVariant = {
  variant: "default" | "secondary" | "destructive" | "outline"
  label: string
  className?: string
}

const STATUS_MAP: Record<string, StatusVariant> = {
  PENDING:      { variant: "secondary",    label: "Pending" },
  UNDER_REVIEW: { variant: "default",      label: "Under Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  FLAGGED:      { variant: "destructive",  label: "Flagged" },
  APPROVED:     { variant: "outline",      label: "Approved",     className: "border-green-500 text-green-600" },
  REJECTED:     { variant: "destructive",  label: "Rejected" },
}

export default function HistoryPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [userInfo, setUserInfo] = useState<{ memberId: string; type: string } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("claimsGuardUser")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    setUserInfo(user)
    fetchClaims(user.memberId)
  }, [router])

  const fetchClaims = async (memberId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/claims?memberId=${encodeURIComponent(memberId)}&limit=100`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message || "Failed to load claims")
      setClaims(json.data || [])
    } catch (err) {
      console.error("Failed to fetch claims:", err)
      setError("Could not load your claims. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const displayed = claims
    .filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          c.claim_number.toLowerCase().includes(q) ||
          (c.provider?.facility_name?.toLowerCase().includes(q) ?? false) ||
          (c.provider?.facility_code?.toLowerCase().includes(q) ?? false) ||
          c.diagnosis_code.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === "newest" ? -diff : diff
    })

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_MAP[status] ?? { variant: "secondary" as const, label: status }
    return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })

  const formatKSH = (n: number) =>
    `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your claims…</p>
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
            <Button onClick={() => userInfo && fetchClaims(userInfo.memberId)}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Claims History</h1>
        <p className="text-muted-foreground mt-1">Review your past claim submissions</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by claim number, diagnosis, or facility…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="FLAGGED">Flagged</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")}
              >
                {sortOrder === "newest"
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No claims found</h3>
            <p className="text-muted-foreground mb-4">
              {claims.length === 0
                ? "You haven't submitted any claims yet"
                : "No claims match your search criteria"}
            </p>
            {claims.length === 0 && (
              <Button onClick={() => router.push("/dashboard/upload")}>Upload a Claim</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayed.map((claim, index) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{claim.claim_number}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {claim.diagnosis_code} — {claim.diagnosis_desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{claim.provider?.facility_name ?? claim.provider?.facility_code ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(claim.service_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{formatKSH(claim.total_billed)}</span>
                    </div>
                    {getStatusBadge(claim.status)}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedClaim(claim)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedClaim?.claim_number}
            </DialogTitle>
            <DialogDescription>
              Service date: {selectedClaim && formatDate(selectedClaim.service_date)}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedClaim.status)}
                <span className="text-sm text-muted-foreground">
                  Fraud score: {selectedClaim.fraud_score}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">
                    {selectedClaim.provider?.facility_name ?? selectedClaim.provider?.facility_code ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service type</p>
                  <p className="font-medium">{selectedClaim.service_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Diagnosis</p>
                  <p className="font-medium">
                    {selectedClaim.diagnosis_code}
                    {selectedClaim.diagnosis_desc ? ` — ${selectedClaim.diagnosis_desc}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total billed</p>
                  <p className="font-medium text-lg">{formatKSH(selectedClaim.total_billed)}</p>
                </div>
                {selectedClaim.approved_amount != null && (
                  <div>
                    <p className="text-muted-foreground">Approved amount</p>
                    <p className="font-medium text-green-600">{formatKSH(selectedClaim.approved_amount)}</p>
                  </div>
                )}
                {selectedClaim.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedClaim.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedClaim(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}