"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, FileText, FolderOpen, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { extractClaimData, type ExtractedClaimData } from "@/lib/claim-schema"

interface FileWithStatus {
  file: File
  status: "pending" | "processing" | "complete" | "error"
  progress: number
  error?: string
  claimData?: ExtractedClaimData
}

interface DocumentUploadProps {
  onClaimsExtracted: (claims: ExtractedClaimData[]) => void
}

export function DocumentUpload({ onClaimsExtracted }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (fileWithStatus: FileWithStatus): Promise<ExtractedClaimData | null> => {
    const { file } = fileWithStatus

    try {
      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      let fullText = ""

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
        fullText += pageText + "\n"
      }

      return extractClaimData(fullText, file.name)
    } catch (error) {
      console.error("Error processing PDF:", error)
      return null
    }
  }

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === "application/pdf")

    if (pdfFiles.length === 0) return

    const filesWithStatus: FileWithStatus[] = pdfFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }))

    setFiles(prev => [...prev, ...filesWithStatus])
    setIsProcessing(true)

    const extractedClaims: ExtractedClaimData[] = []

    for (let i = 0; i < filesWithStatus.length; i++) {
      const fileWithStatus = filesWithStatus[i]

      setFiles(prev =>
        prev.map(f =>
          f.file === fileWithStatus.file
            ? { ...f, status: "processing", progress: 50 }
            : f
        )
      )

      const claimData = await processFile(fileWithStatus)

      if (claimData) {
        extractedClaims.push(claimData)
        setFiles(prev =>
          prev.map(f =>
            f.file === fileWithStatus.file
              ? { ...f, status: "complete", progress: 100, claimData }
              : f
          )
        )
      } else {
        setFiles(prev =>
          prev.map(f =>
            f.file === fileWithStatus.file
              ? { ...f, status: "error", progress: 0, error: "Failed to extract data" }
              : f
          )
        )
      }
    }

    setIsProcessing(false)

    if (extractedClaims.length > 0) {
      onClaimsExtracted(extractedClaims)
    }
  }, [onClaimsExtracted])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles: File[] = []

    if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) droppedFiles.push(file)
        }
      }
    } else {
      droppedFiles.push(...Array.from(e.dataTransfer.files))
    }

    handleFiles(droppedFiles)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file))
  }

  const clearAll = () => {
    setFiles([])
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200",
          "flex flex-col items-center justify-center text-center min-h-[240px]",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "p-4 rounded-full transition-colors",
            isDragging ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "w-8 h-8 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isDragging ? "Drop files here" : "Upload Claim Documents"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Drag and drop PDF files or folders, or click to browse
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FileText className="w-4 h-4 mr-2" />
              Select Files
            </Button>
            <Button
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Select Folder
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-foreground">
                Uploaded Files ({files.length})
              </h4>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={isProcessing}>
                Clear All
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {files.map((fileWithStatus, index) => (
                <div
                  key={`${fileWithStatus.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {fileWithStatus.file.name}
                    </p>

                    {fileWithStatus.status === "processing" && (
                      <Progress value={fileWithStatus.progress} className="h-1 mt-2" />
                    )}

                    {fileWithStatus.status === "error" && (
                      <p className="text-xs text-destructive mt-1">{fileWithStatus.error}</p>
                    )}

                    {fileWithStatus.status === "complete" && fileWithStatus.claimData && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {fileWithStatus.claimData.confidence}%
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {fileWithStatus.status === "pending" && (
                      <span className="text-xs text-muted-foreground">Waiting...</span>
                    )}
                    {fileWithStatus.status === "processing" && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    )}
                    {fileWithStatus.status === "complete" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {fileWithStatus.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => removeFile(fileWithStatus.file)}
                    disabled={fileWithStatus.status === "processing"}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}