"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileJson,
  Copy,
  Check,
  Send,
  User,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type ExtractedClaimData } from "@/lib/claim-schema"

interface ClaimsListProps {
  claims: ExtractedClaimData[]
  onSubmitClaim: (claim: ExtractedClaimData) => Promise<void>
}

function ClaimCard({
  claim,
  onSubmit
}: {
  claim: ExtractedClaimData
  onSubmit: (claim: ExtractedClaimData) => Promise<void>
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(claim, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(claim)
      setIsSubmitted(true)
    } catch (error) {
      console.error("Failed to submit claim:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "bg-green-500/10 text-green-600 border-green-200"
    if (confidence >= 40) return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
    return "bg-red-500/10 text-red-600 border-red-200"
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                {claim.notes?.replace("Extracted from: ", "") || "Uploaded Document"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Member: {claim.memberNumber || "Unknown"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("font-medium", getConfidenceColor(claim.confidence))}
            >
              {claim.confidence}% confidence
            </Badge>
            {isSubmitted && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                Submitted
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t bg-muted/30">
          <div className="grid gap-6 py-4">
            {/* Member Information */}
            {claim.memberNumber && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4 text-primary" />
                  Member Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Member Number:</span>
                    <p className="font-medium text-foreground">{claim.memberNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Information */}
            {(claim.facilityCode) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Building className="w-4 h-4 text-primary" />
                  Provider Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Facility Code:</span>
                    <p className="font-medium text-foreground">{claim.facilityCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Service Details */}
            {(claim.serviceDate || claim.diagnosisCode || claim.diagnosisDesc) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  Service Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {claim.serviceDate && (
                    <div>
                      <span className="text-muted-foreground">Service Date:</span>
                      <p className="font-medium text-foreground">{claim.serviceDate}</p>
                    </div>
                  )}
                  {claim.diagnosisCode && (
                    <div>
                      <span className="text-muted-foreground">Diagnosis Code:</span>
                      <p className="font-medium text-foreground">{claim.diagnosisCode}</p>
                    </div>
                  )}
                  {claim.diagnosisDesc && (
                    <div>
                      <span className="text-muted-foreground">Diagnosis:</span>
                      <p className="font-medium text-foreground">{claim.diagnosisDesc}</p>
                    </div>
                  )}
                  {claim.serviceType && (
                    <div>
                      <span className="text-muted-foreground">Service Type:</span>
                      <p className="font-medium text-foreground">{claim.serviceType}</p>
                    </div>
                  )}
                  {claim.lineItems && claim.lineItems.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Procedure Codes:</span>
                      <p className="font-medium text-foreground">
                        {claim.lineItems.map(li => li.procedureCode).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Information */}
            {claim.totalBilled && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Financial Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Billed:</span>
                    <p className="font-medium text-foreground">
                      KSh {claim.totalBilled.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* JSON View */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowJson(!showJson) }}
              >
                <FileJson className="w-4 h-4 mr-2" />
                {showJson ? "Hide JSON" : "View JSON"}
              </Button>

              {showJson && (
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs text-foreground">
                    {JSON.stringify(claim, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={(e) => { e.stopPropagation(); copyJson() }}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t">
              <Button
                onClick={(e) => { e.stopPropagation(); handleSubmit() }}
                disabled={isSubmitting || isSubmitted}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : isSubmitted ? (
                  <><Check className="w-4 h-4 mr-2" />Submitted</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Submit to Backend</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function ClaimsList({ claims, onSubmitClaim }: ClaimsListProps) {
  if (claims.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileJson className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No Claims Extracted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PDF documents to extract claim data
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Extracted Claims ({claims.length})
        </h3>
      </div>
      <div className="space-y-3">
        {claims.map((claim, index) => (
          <ClaimCard key={index} claim={claim} onSubmit={onSubmitClaim} />
        ))}
      </div>
    </div>
  )
}