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
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  FileWarning,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Building2,
  User,
  Calendar,
  DollarSign,
  Upload,
  FileText,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface Claim {
  id: string
  claim_number: string
  member: {
    id: string
    full_name: string
    member_number: string
  }
  provider: {
    id: string
    facility_name: string
    facility_code: string
  }
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
  rejection_reason: string | null
  created_at: string
  fraud_flags: Array<{
    flag_type: string
    flag_reason: string
    severity: string
  }>
}

export default function FlaggedClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [labelFilter, setLabelFilter] = useState<string>("all")
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewNotes, setReviewNotes] = useState("")
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null)
  const [supportingDocDesc, setSupportingDocDesc] = useState("")
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; file_name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [fraudRules, setFraudRules] = useState<Array<{ ruleName: string; passed: boolean; reason: string }>>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [reimbursement, setReimbursement] = useState<{ reimbursement: number; breakdown: string } | null>(null)
  const [loadingReimbursement, setLoadingReimbursement] = useState(false)
  const [memberWallet, setMemberWallet] = useState<{ balance: number } | null>(null)

  useEffect(() => {
    fetchClaims()
  }, [statusFilter, labelFilter, searchTerm])

  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (labelFilter !== "all") params.append("fraudLabel", labelFilter)
      if (searchTerm.trim()) params.append("search", searchTerm.trim())

      const response = await fetch(`/api/admin/claims?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClaims(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch claims:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewClaim = async () => {
    if (!selectedClaim || !reviewAction) return

    // Approval requires at least one supporting document
    if (reviewAction === "approve" && uploadedDocs.length === 0 && !supportingDocFile) {
      alert("Please upload at least one supporting document before approving a claim.")
      return
    }

    setSubmitting(true)
    try {
      // Step 1 — Upload supporting document first (if a new file was picked)
      if (supportingDocFile && selectedClaim) {
        const docForm = new FormData()
        docForm.append("file", supportingDocFile)
        docForm.append("description", supportingDocDesc)

        const docRes = await fetch(
          `/api/admin/claims/${selectedClaim.id}/supporting-documents`,
          { method: "POST", body: docForm }
        )

        if (!docRes.ok) {
          const err = await docRes.json().catch(() => ({}))
          throw new Error(err.message || "Failed to upload supporting document")
        }
      }

      // Step 2 — Submit approve / reject
      const response = await fetch(`/api/admin/claims/${selectedClaim.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          notes: reviewNotes,
        }),
      })

      if (response.ok) {
        fetchClaims()
        setIsReviewDialogOpen(false)
        setSelectedClaim(null)
        setReviewNotes("")
        setReviewAction(null)
        setSupportingDocFile(null)
        setSupportingDocDesc("")
        setUploadedDocs([])
      }
    } catch (error) {
      console.error("Failed to review claim:", error)
      alert(error instanceof Error ? error.message : "An error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Supporting-document helpers ─────────────────────────────────────────────
  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    setSupportingDocFile(picked)
    setSupportingDocDesc(prev => prev || picked.name.replace(/\.[^/.]+$/, ""))
  }

  const uploadDocImmediately = async () => {
    if (!supportingDocFile || !selectedClaim) return
    setUploadingDoc(true)
    try {
      const form = new FormData()
      form.append("file", supportingDocFile)
      form.append("description", supportingDocDesc)

      const res = await fetch(
        `/api/admin/claims/${selectedClaim.id}/supporting-documents`,
        { method: "POST", body: form }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Upload failed")
      }
      const json = await res.json()
      setUploadedDocs(prev => [...prev, { id: json.data.id, file_name: json.data.file_name }])
      setSupportingDocFile(null)
      setSupportingDocDesc("")
    } catch (err) {
      console.error("Doc upload failed:", err)
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingDoc(false)
    }
  }

  const removeUploadedDoc = (docId: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== docId))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>
      case "FLAGGED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Flagged</Badge>
      case "UNDER_REVIEW":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Under Review</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const getFraudLabelBadge = (label: string, score: number) => {
    switch (label) {
      case "FRAUDULENT":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Fraudulent ({score}%)
          </Badge>
        )
      case "SUSPICIOUS":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
            <AlertTriangle className="w-3 h-3" />
            Suspicious ({score}%)
          </Badge>
        )
      default:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
            <CheckCircle className="w-3 h-3" />
            Valid ({score}%)
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading claims...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Flagged Claims Review</h1>
        <p className="text-muted-foreground mt-1">
          Claims are automatically triaged by rule-based validation and ML scoring.
          <span className="text-amber-500">Suspicious</span> claims require manual review.
          <span className="text-red-500">Fraudulent</span> claims are auto-rejected.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by claim number, member, or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
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
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Fraud Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labels</SelectItem>
                <SelectItem value="FRAUDULENT">Fraudulent</SelectItem>
                <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                <SelectItem value="VALID">Valid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <div className="space-y-4">
        {claims.map((claim, index) => (
          <motion.div
            key={claim.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`${
              claim.fraud_label === "FRAUDULENT"
                ? "border-red-500/30"
                : claim.fraud_label === "SUSPICIOUS"
                ? "border-amber-500/30"
                : ""
            }`}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      claim.fraud_label === "FRAUDULENT"
                        ? "bg-red-500/10"
                        : claim.fraud_label === "SUSPICIOUS"
                        ? "bg-amber-500/10"
                        : "bg-muted"
                    }`}>
                      <FileWarning className={`w-6 h-6 ${
                        claim.fraud_label === "FRAUDULENT"
                          ? "text-red-500"
                          : claim.fraud_label === "SUSPICIOUS"
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{claim.claim_number}</span>
                        {getStatusBadge(claim.status)}
                        {getFraudLabelBadge(claim.fraud_label, claim.fraud_score)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {claim.member.full_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {claim.provider.facility_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(claim.service_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Diagnosis: </span>
                        <span className="text-foreground">{claim.diagnosis_code} - {claim.diagnosis_desc}</span>
                      </div>
                      {claim.fraud_flags && claim.fraud_flags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {claim.fraud_flags.map((flag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-xs ${
                                flag.severity === "HIGH"
                                  ? "border-red-500/30 text-red-500"
                                  : flag.severity === "MEDIUM"
                                  ? "border-amber-500/30 text-amber-500"
                                  : "border-border"
                              }`}
                            >
                              {flag.flag_type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xl font-bold text-foreground">
                          KSh {claim.total_billed.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                          onClick={() => {
                            setSelectedClaim(claim)
                            setIsReviewDialogOpen(true)
                            setFraudRules([])
                            setReimbursement(null)
                            setMemberWallet(null)
                            if (claim.id) {
                              fetch(`/api/admin/claims/${claim.id}/fraud-rules`)
                                .then(r => r.json())
                                .then(d => { if (d.success) setFraudRules(d.data) })
                                .catch(() => {})
                              fetch(`/api/admin/claims/${claim.id}/reimbursement?claimed_amount=${claim.total_billed}`)
                                .then(r => r.json())
                                .then(d => { if (d.success) setReimbursement(d.data) })
                                .catch(() => {})
                              fetch(`/api/admin/wallets?memberId=${claim.member.id}`)
                                .then(r => r.json())
                                .then(d => { if (d.success) setMemberWallet(d.data.wallet) })
                                .catch(() => {})
                            }
                          }}
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {claims.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/50 mb-4" />
              <p className="text-lg font-medium text-foreground">No claims found</p>
              <p className="text-muted-foreground">
                No claims match your current filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={(open) => {
        setIsReviewDialogOpen(open)
        if (!open) {
          setReviewNotes("")
          setReviewAction(null)
          setSupportingDocFile(null)
          setSupportingDocDesc("")
          setUploadedDocs([])
          setUploadingDoc(false)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Claim: {selectedClaim?.claim_number}</DialogTitle>
            <DialogDescription>
              Review the claim details and take action
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-6">
              {/* Claim Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Member:</span>
                  <p className="font-medium">{selectedClaim.member.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider:</span>
                  <p className="font-medium">{selectedClaim.provider.facility_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Service Date:</span>
                  <p className="font-medium">{format(new Date(selectedClaim.service_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Service Type:</span>
                  <p className="font-medium">{selectedClaim.service_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Diagnosis:</span>
                  <p className="font-medium">{selectedClaim.diagnosis_code} - {selectedClaim.diagnosis_desc}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium text-lg">KSh {selectedClaim.total_billed.toLocaleString()}</p>
                </div>
              </div>

              {/* Fraud Flags */}
              {selectedClaim.fraud_flags && selectedClaim.fraud_flags.length > 0 && (
                <div className="space-y-2">
                  {selectedClaim.fraud_flags.map((flag, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-500">{flag.flag_type}</span>
              <Badge variant="outline" className="text-xs">{flag.severity}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{flag.flag_reason}</p>
          </div>
        ))}
                </div>
              )}
              {selectedClaim.fraud_flags?.length === 0 && (
                <p className="text-sm text-muted-foreground">No fraud flags set on this claim.</p>
              )}

              {/* Rejection Reason */}
              {selectedClaim.rejection_reason && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <p className="text-sm font-medium text-red-500">Rejection Reason</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedClaim.rejection_reason}</p>
                </div>
              )}

              {/* Rule-Based Validation Results */}
              {fraudRules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Fraud Rule Validation</p>
                  {fraudRules.map((rule, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${rule.passed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                      <div className="flex items-center gap-2">
                        {rule.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium text-sm">{rule.ruleName}</span>
                        <Badge variant={rule.passed ? "default" : "destructive"} className="text-xs">
                          {rule.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reimbursement Calculation */}
              {reimbursement && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-medium text-foreground">Reimbursement Estimate</p>
                  <p className="text-xs text-muted-foreground mt-1">{reimbursement.breakdown}</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">
                    KSh {reimbursement.reimbursement.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Member Wallet */}
              {memberWallet && reviewAction === "approve" && (
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-sm font-medium">Current Wallet Balance: <span className="font-bold">KSh {memberWallet.balance.toLocaleString()}</span></p>
                  {reimbursement && (
                    <p className="text-xs text-muted-foreground mt-1">
                      After approval: <span className="font-medium text-emerald-600">KSh {(memberWallet.balance + reimbursement.reimbursement).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              )}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Supporting Documents</span>
                {reviewAction === "approve" && uploadedDocs.length === 0 && !supportingDocFile && (
                  <span className="text-xs text-red-500 ml-auto">Required before approval</span>
                )}
              </div>

              {/* Already uploaded doc list */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2 mb-3">
                  {uploadedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border text-sm">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate flex-1">{doc.file_name}</span>
                      <Badge variant="secondary" className="text-xs">Uploaded</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* File picker row */}
              <div className="flex gap-2 items-center">
                <label className="flex-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">
                      {supportingDocFile
                        ? supportingDocFile.name
                        : "Choose PDF, JPG, PNG, or TXT…"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                    className="hidden"
                    onChange={handleDocFileChange}
                  />
                </label>
                {supportingDocFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={uploadDocImmediately}
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? "Uploading…" : "Upload"}
                  </Button>
                )}
              </div>

              {uploadedDocs.length > 0 && reviewAction !== "approve" && (
                <p className="text-xs text-emerald-600 mt-1">
                  {uploadedDocs.length} document(s) attached. You can now approve or reject.
                </p>
              )}
            </div>

            {/* Review Notes */}
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="gap-1"
              onClick={() => {
                setReviewAction("reject")
                handleReviewClaim()
              }}
            >
              <XCircle className="w-4 h-4" />
              Reject Claim
            </Button>
            <Button
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setReviewAction("approve")
                handleReviewClaim()
              }}
            >
              <CheckCircle className="w-4 h-4" />
              Approve Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
