import { query, addSupportingDocument } from "@/lib/db/operations"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public", "supporting-docs")

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify the claim exists
    const claimResult = await query<{ id: string }>(
      `SELECT id FROM claims WHERE id = $1`,
      [id]
    )
    if (claimResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Claim not found" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file     = formData.get("file")  as File | null
    const description = (formData.get("description") as string) || ""

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      )
    }

    // Accept PDF, images, and text documents
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `File type "${file.type}" is not allowed. Accepted: PDF, JPG, PNG, WEBP, TXT` },
        { status: 400 }
      )
    }

    const maxBytes = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, message: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` },
        { status: 400 }
      )
    }

    // Save the file to public/supporting-docs/<claim-id>/
    const claimDir = path.join(UPLOAD_DIR, id)
    await mkdir(claimDir, { recursive: true })

    const safeFileName     = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const timestamp        = Date.now()
    const storedFileName    = `${timestamp}-${safeFileName}`
    const filePath          = path.join(claimDir, storedFileName)
    const relativeFilePath  = `/supporting-docs/${id}/${storedFileName}`

    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, bytes)

    // Record in database
    const doc = await addSupportingDocument({
      claimId: id,
      fileName: file.name,
      filePath: relativeFilePath,
      fileSize: file.size,
      contentType: file.type,
      description,
      uploadedBy: "admin",
    })

    return NextResponse.json({
      success: true,
      data: {
        id:           doc.id,
        file_name:    doc.file_name,
        file_path:    doc.file_path,
        content_type: doc.content_type,
        created_at:   doc.created_at,
      },
    })
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to upload document" },
      { status: 500 }
    )
  }
}
