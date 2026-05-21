// src/lib/photos.ts
import fs from 'fs'
import path from 'path'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'photos')

export async function savePhoto(surveyId: string, file: File): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, surveyId)
  fs.mkdirSync(dir, { recursive: true })

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filepath = path.join(dir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filepath, buffer)

  return `/uploads/photos/${surveyId}/${filename}`
}

export function deletePhoto(url: string): void {
  const rel = url.startsWith('/') ? url.slice(1) : url
  const filepath = path.join(process.cwd(), 'public', rel)
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads')
  if (!filepath.startsWith(uploadRoot + path.sep) && filepath !== uploadRoot) {
    throw new Error('Invalid photo path')
  }
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

export function getPhotoBuffer(url: string): Buffer {
  const rel = url.startsWith('/') ? url.slice(1) : url
  const filepath = path.join(process.cwd(), 'public', rel)
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads')
  if (!filepath.startsWith(uploadRoot + path.sep) && filepath !== uploadRoot) {
    throw new Error('Invalid photo path')
  }
  return fs.readFileSync(filepath)
}
