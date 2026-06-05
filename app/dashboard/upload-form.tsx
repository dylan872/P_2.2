"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface UploadFormProps {
  onClaimUploaded?: () => void
}

export function UploadForm({ onClaimUploaded }: UploadFormProps) {
  const { user, loading } = useAuth()
  const [formData, setFormData] = useState({
    diagnosis: "",
    serviceType: "OUTPATIENT",
    totalBilled: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user?.memberNumber) {
      setError("Unable to determine logged in user")
      return
    }

    const billedValue = parseFloat(formData.totalBilled)
    if (Number.isNaN(billedValue) || billedValue <= 0) {
      setError("Please enter a valid total billed amount")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberNumber: user.memberNumber,
          diagnosis: formData.diagnosis,
          serviceType: formData.serviceType,
          totalBilled: billedValue,
          notes: formData.notes,
        }),
      })

      const json = await response.json()
      if (!json.success) {
        setError(json.message || "Failed to upload claim")
        return
      }

      setSuccess(true)
      setFormData({ diagnosis: "", serviceType: "OUTPATIENT", totalBilled: "", notes: "" })
      onClaimUploaded?.()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("[v0] Upload error:", err)
      setError("Failed to upload claim")
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return <div className="text-slate-400">Loading upload form...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="diagnosis">Diagnosis</Label>
        <Input
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(event) => setFormData((prev) => ({ ...prev, diagnosis: event.target.value }))}
          placeholder="Enter a diagnosis description"
        />
      </div>

      <div>
        <Label htmlFor="serviceType">Service Type</Label>
        <Input
          id="serviceType"
          value={formData.serviceType}
          onChange={(event) => setFormData((prev) => ({ ...prev, serviceType: event.target.value }))}
          placeholder="OUTPATIENT"
        />
      </div>

      <div>
        <Label htmlFor="totalBilled">Total Billed</Label>
        <Input
          id="totalBilled"
          type="number"
          value={formData.totalBilled}
          onChange={(event) => setFormData((prev) => ({ ...prev, totalBilled: event.target.value }))}
          placeholder="Enter billed amount"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Optional notes"
          rows={4}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">Claim uploaded successfully.</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Uploading..." : "Upload Claim"}
      </Button>
    </form>
  )
}
