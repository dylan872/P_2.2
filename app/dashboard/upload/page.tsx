"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, X, Upload, ArrowRight } from "lucide-react"
import { UploadAnimation } from "@/components/upload-animation"
import { extractClaimData, SubmitClaimRequest } from "@/lib/claim-schema"
import { v4 as uuidv4 } from "uuid"
import * as pdfjsLib from "pdfjs-dist"

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

interface UploadedFile {
  file: File
  id: string
  status: "queued" | "uploading" | "processing" | "complete" | "error"
  progress: number
  extractedData?: ReturnType<typeof extractClaimData>
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null)
  const [overallStage, setOverallStage] = useState<"idle" | "uploading" | "processing" | "complete">("idle")

  // Get user info from session storage
  const [userInfo, setUserInfo] = useState<{ memberId: string; type: string } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("claimsGuardUser")
    if (stored) {
      setUserInfo(JSON.parse(stored))
    } else {
      router.push("/")
    }
  }, [router])

  const processFile = async (uploadedFile: UploadedFile): Promise<UploadedFile> => {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((r) => setTimeout(r, 100))
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: "uploading", progress } : f
        )
      )
    }

    // Update to processing
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadedFile.id ? { ...f, status: "processing", progress: 100 } : f
      )
    )

    try {
      let extractedText = ""

      if (uploadedFile.file.type === "application/pdf") {
        const arrayBuffer = await uploadedFile.file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          extractedText += textContent.items
            .map((item: unknown) => (item as { str: string }).str)
            .join(" ")
        }
      } else {
        extractedText = await uploadedFile.file.text()
      }

      await new Promise((r) => setTimeout(r, 1000)) // Simulate processing time

      const extracted = extractClaimData(extractedText, uploadedFile.file.name)

      // Submit claim to local API
      if (userInfo) {
        const submitData: SubmitClaimRequest = {
          memberNumber: userInfo.memberId,
          facilityCode: extracted.facilityCode,
          serviceDate: extracted.serviceDate,
          diagnosisCode: extracted.diagnosisCode,
          diagnosisDesc: extracted.diagnosisDesc,
          serviceType: extracted.serviceType,
          totalBilled: extracted.totalBilled,
          notes: extracted.notes,
          lineItems: extracted.lineItems,
        }

        const response = await fetch("/api/claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          throw new Error(errorBody.message || `Server error ${response.status}`)
        }
      }

      return { ...uploadedFile, status: "complete", extractedData: extracted }
    } catch (error) {
      return {
        ...uploadedFile,
        status: "error",
        error: error instanceof Error ? error.message : "Processing failed",
      }
    }
  }

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const uploadedFiles: UploadedFile[] = fileArray.map((file) => ({
      file,
      id: uuidv4(),
      status: "queued" as const,
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...uploadedFiles])
    setOverallStage("uploading")

    // Process files sequentially
    for (const uploadedFile of uploadedFiles) {
      setCurrentProcessing(uploadedFile.id)
      const processed = await processFile(uploadedFile)
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadedFile.id ? processed : f))
      )
    }

    setCurrentProcessing(null)
    setOverallStage("complete")

    // Reset to idle after a delay
    setTimeout(() => {
      setOverallStage("idle")
    }, 3000)
  }, [userInfo])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const completedCount = files.filter((f) => f.status === "complete").length
  const processingFile = files.find((f) => f.id === currentProcessing)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Claims</h1>
        <p className="text-muted-foreground mt-1">
          Upload your healthcare claim documents for processing
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-8">
          <motion.div
            className={`
              relative border-2 border-dashed rounded-xl p-8 transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-border"}
              ${files.length === 0 ? "min-h-100" : "min-h-62.5"}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            animate={{ scale: isDragging ? 1.02 : 1 }}
          >
            <UploadAnimation
              stage={
                currentProcessing
                  ? files.find((f) => f.id === currentProcessing)?.status === "uploading"
                    ? "uploading"
                    : "processing"
                  : overallStage
              }
              progress={processingFile?.progress}
              fileName={processingFile?.file.name}
            />

            {overallStage === "idle" && (
              <div className="flex flex-col items-center gap-4 mt-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, TXT
                </p>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Uploaded Files</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {completedCount} of {files.length} processed
                  </span>
                </CardTitle>
                <CardDescription>
                  Your claim documents are being processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.map((uploadedFile) => (
                    <motion.div
                      key={uploadedFile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`
                        flex items-center gap-4 p-4 rounded-lg border
                        ${uploadedFile.status === "complete" ? "border-green-500/30 bg-green-500/5" : ""}
                        ${uploadedFile.status === "error" ? "border-red-500/30 bg-red-500/5" : ""}
                        ${uploadedFile.status === "processing" ? "border-primary/30 bg-primary/5" : ""}
                        ${uploadedFile.status === "uploading" ? "border-border" : ""}
                        ${uploadedFile.status === "queued" ? "border-border bg-muted/30" : ""}
                      `}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {uploadedFile.status === "queued" && "Waiting..."}
                          {uploadedFile.status === "uploading" && `Uploading... ${uploadedFile.progress}%`}
                          {uploadedFile.status === "processing" && "Extracting data..."}
                          {uploadedFile.status === "complete" && `Confidence: ${uploadedFile.extractedData?.confidence}%`}
                          {uploadedFile.status === "error" && uploadedFile.error}
                        </p>
                        {(uploadedFile.status === "uploading" || uploadedFile.status === "processing") && (
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadedFile.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {uploadedFile.status === "complete" || uploadedFile.status === "error" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(uploadedFile.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </motion.div>
                  ))}
                </div>

                {completedCount > 0 && completedCount === files.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 flex justify-end"
                  >
                    <Button onClick={() => router.push("/dashboard/history")}>
                      View All Claims
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
