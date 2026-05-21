// src/lib/photos.ts
import fs from 'fs'
import path from 'path'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'photos')

// ── helpers ──────────────────────────────────────────────────────────────────

function isBlobUrl(url: string): boolean {
  return url.startsWith('https://')
}

function assertSafeLocalPath(url: string): string {
  const rel = url.startsWith('/') ? url.slice(1) : url
  const filepath = path.join(process.cwd(), 'public', rel)
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads')
  if (!filepath.startsWith(uploadRoot + path.sep) && filepath !== uploadRoot) {
    throw new Error('Invalid photo path')
  }
  return filepath
}

function mimeFromUrl(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() ?? 'jpg'
  return ext === 'png' ? 'image/png' : 'image/jpeg'
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Persist a photo file.
 * - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production)
 * - Local filesystem otherwise (development)
 */
export async function savePhoto(surveyId: string, file: File): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { url } = await put(`${surveyId}/${filename}`, file, { access: 'public' })
    return url
  }

  const dir = path.join(UPLOAD_ROOT, surveyId)
  fs.mkdirSync(dir, { recursive: true })
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, Buffer.from(await file.arrayBuffer()))
  return `/uploads/photos/${surveyId}/${filename}`
}

/**
 * Delete a stored photo by its URL.
 * Accepts both Vercel Blob https:// URLs and local /uploads/ paths.
 */
export async function deletePhoto(url: string): Promise<void> {
  if (isBlobUrl(url)) {
    const { del } = await import('@vercel/blob')
    await del(url)
    return
  }
  const filepath = assertSafeLocalPath(url)
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

/**
 * Fetch a photo and return it as a base64 data URI for PDF embedding.
 * Returns null if the photo cannot be read (missing, fetch error, etc.).
 * Re-throws on path-guard violations (security).
 */
export async function getPhotoDataUri(url: string): Promise<string | null> {
  try {
    if (isBlobUrl(url)) {
      const res = await fetch(url)
      if (!res.ok) return null
      const buf = await res.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      return `data:${mimeFromUrl(url)};base64,${base64}`
    }

    const filepath = assertSafeLocalPath(url) // throws on bad path — propagate
    const buf = fs.readFileSync(filepath)
    return `data:${mimeFromUrl(url)};base64,${buf.toString('base64')}`
  } catch (e) {
    if (e instanceof Error && e.message === 'Invalid photo path') throw e
    return null
  }
}
