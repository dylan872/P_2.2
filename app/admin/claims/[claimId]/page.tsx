"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle, XCircle, ArrowLeft, DollarSign, User, Building2, Calendar, Upload, FileText } from "lucide-react"
import { format } from "date-fns"

interface FraudFlag {
  flag_type: string
  flag_reason: string
  severity: string
}

interface ClaimDetail {
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
  fraud_flags: FraudFlag[]
}

export default function FraudReviewPage({ params }: { params: Promise<{ claimId: string }> }) {
  const router = useRouter()
  const [claim, setClaim] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimId, setClaimId] = useState<string | null>(null)

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null)
  const [supportingDocDesc, setSupportingDocDesc] = useState("")
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; file_name: string }>>([])

  useEffect(() => {
    params.then((p) => {
      setClaimId(p.claimId)
    })
  }, [params])

  useEffect(() => {
    if (!claimId) return
    fetchClaim()
  }, [claimId])

  const fetchClaim = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/claims?id=${encodeURIComponent(claimId!)}`)
      if (!res.ok) throw new Error("Failed to fetch claim")
      const data = await res.json()
      if (data.success) {
        setClaim(data.data)
      }
    } catch (err) {
      console.error("Failed to load claim:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!claim || !reviewAction) return

    // Approval requires at least one supporting document
    if (reviewAction === "approve" && uploadedDocs.length === 0 && !supportingDocFile) {
      alert("Please upload at least one supporting document before approving a claim.")
      return
    }

    setSubmitting(true)
    try {
      // Step 1 — upload supporting document first (if a new file was picked)
      if (supportingDocFile && claim) {
        const form = new FormData()
        form.append("file", supportingDocFile)
        form.append("description", supportingDocDesc)
        const docRes = await fetch(
          `/api/admin/claims/${claim.id}/supporting-documents`,
          { method: "POST", body: form }
        )
        if (!docRes.ok) {
          const err = await docRes.json().catch(() => ({}))
          throw new Error(err.message || "Failed to upload supporting document")
        }
      }

      // Step 2 — submit approve / reject
      const res = await fetch(`/api/admin/claims/${claim.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reviewAction, notes: reviewNotes }),
      })
      if (res.ok) {
        setReviewDialogOpen(false)
        fetchClaim()
      }
    } catch (err) {
      console.error("Review failed:", err)
      alert(err instanceof Error ? err.message : "An error occurred.")
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
    if (!supportingDocFile || !claim) return
    setUploadingDoc(true)
    try {
      const form = new FormData()
      form.append("file", supportingDocFile)
      form.append("description", supportingDocDesc)
      const res = await fetch(
        `/api/admin/claims/${claim.id}/supporting-documents`,
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

  const severityVariant = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "destructive"
      case "HIGH":     return "destructive"
      case "MEDIUM":   return "default"
      default:         return "secondary"
    }
  }

  const labelBadge = (label: string, score: number) => {
    switch (label) {
      case "FRAUDULENT":
        return <Badge variant="destructive">Fraudulent ({score}%)</Badge>
      case "SUSPICIOUS":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Suspicious ({score}%)</Badge>
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Valid ({score}%)</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading claim…</div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">Claim not found or has no fraud flags.</p>
            <Button variant="outline" onClick={() => router.push("/admin/claims")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Flagged Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/claims")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fraud Review</h1>
          <p className="text-muted-foreground">
            {claim.claim_number} — Detailed fraud analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info col */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Summary */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Claim Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Claim Number</span>
                    <p className="font-medium">{claim.claim_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fraud Score</span>
                    <p className="font-medium flex items-center gap-2">
                      {labelBadge(claim.fraud_label, claim.fraud_score)}
                      <span className="font-bold text-lg">{claim.fraud_score}%</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium">{claim.status.replace("_", " ")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service Type</span>
                    <p className="font-medium">{claim.service_type.replace("_", " ")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Service Date</span>
                    <p className="font-medium">{format(new Date(claim.service_date), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Member</span>
                    <p className="font-medium">{claim.member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{claim.member.member_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Provider</span>
                    <p className="font-medium">{claim.provider.facility_name}</p>
                    <p className="text-xs text-muted-foreground">{claim.provider.facility_code}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total Billed</span>
                    <p className="font-medium text-lg">KSh {claim.total_billed.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Diagnosis</span>
                    <p className="font-medium">{claim.diagnosis_code} — {claim.diagnosis_desc}</p>
                  </div>
                  {claim.notes && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Notes</span>
                      <p className="font-medium">{claim.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fraud Flags / Reasons */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  Fra&shy;ud Reasons Why This Claim Was Flagged
                </CardTitle>
                <CardDescription>
                  Each rule triggered by the fraud detection engine with severity and explanation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {claim.fraud_flags && claim.fraud_flags.length > 0 ? (
                  <div className="space-y-3">
                    {claim.fraud_flags.map((flag, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`rounded-lg border p-4 ${
                          flag.severity === "CRITICAL"
                            ? "bg-red-500/8 border-red-500/30"
                            : flag.severity === "HIGH"
                            ? "bg-red-500/5 border-red-500/20"
                            : flag.severity === "MEDIUM"
                            ? "bg-amber-500/5 border-amber-500/20"
                            : "bg-muted border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`w-4 h-4 ${
                            flag.severity === "CRITICAL" || flag.severity === "HIGH"
                              ? "text-red-500"
                              : flag.severity === "MEDIUM"
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          }`} />
                          <span className="font-medium text-foreground">{flag.flag_type.replace(/_/g, " ")}</span>
                          <Badge variant={severityVariant(flag.severity)} className="text-xs ml-auto">
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.flag_reason}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fraud flags recorded for this claim.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Score card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="text-center">
              <CardContent className="pt-6 space-y-4">
                <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Fraud Score</p>
                  <p className="text-4xl font-bold text-red-500">{claim.fraud_score}%</p>
                  {labelBadge(claim.fraud_label, claim.fraud_score)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {format(new Date(claim.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          {claim.status !== "APPROVED" && claim.status !== "REJECTED" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Take Action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={() => { setReviewAction("approve"); setReviewDialogOpen(true) }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Claim
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => { setReviewAction("reject"); setReviewDialogOpen(true) }}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Claim
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Already reviewed */}
          {(claim.status === "APPROVED" || claim.status === "REJECTED") && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className={claim.status === "APPROVED" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}>
                <CardContent className="pt-6 text-center space-y-2">
                  <CheckCircle className={`w-10 h-10 mx-auto ${claim.status === "APPROVED" ? "text-emerald-500" : "text-red-500"}`} />
                  <p className="font-medium text-lg">
                    {claim.status === "APPROVED" ? "Claim Approved" : "Claim Rejected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {claim.approved_amount != null
                      ? `Approved: KSh ${claim.approved_amount.toLocaleString()}`
                      : "No approval amount"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Review Confirmation Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { setReviewDialogOpen(open); if (!open) { setReviewAction(null); setReviewNotes(""); setSupportingDocFile(null); setSupportingDocDesc(""); setUploadedDocs([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Claim {claim.claim_number}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "This will set the claim status to APPROVED. Upload at least one supporting document first."
                : "This will set the claim status to REJECTED. The claim will be archived."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Supporting Documents */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Supporting Document{uploadedDocs.length !== 1 ? 's' : ''}</span>
                {reviewAction === "approve" && uploadedDocs.length === 0 && (
                  <span className="text-xs text-red-500 ml-auto font-medium">Required</span>
                )}
              </div>

              {/* Uploaded doc list */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  {uploadedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border text-sm">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate flex-1">{doc.file_name}</span>
                      <Badge variant="secondary" className="text-xs">Saved</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* File picker */}
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
                    {uploadingDoc ? "Saving…" : "Save"}
                  </Button>
                )}
              </div>
            </div>

            {/* Review Notes */}
            <div>
              <label className="text-sm font-medium">Review Notes</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === "approve" ? "Reason for approval…" : "Reason for rejection…"}
                className="mt-1"
              />
            </div>
            {reviewAction === "reject" && !reviewNotes.trim() && (
              <p className="text-xs text-amber-600">Please provide a reason before rejecting.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReviewDialogOpen(false); setReviewAction(null); setReviewNotes(""); setSupportingDocFile(null); setSupportingDocDesc(""); setUploadedDocs([]) }} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={handleSubmitReview}
              disabled={submitting || (reviewAction === "approve" && uploadedDocs.length === 0) || (reviewAction === "reject" && !reviewNotes.trim())}
              className="gap-1"
            >
              {submitting ? "Saving…" : (reviewAction === "approve" ? "Approve" : "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
