// src/components/survey/PhotoSlot.tsx
'use client'

import { useRef } from 'react'
import type { UploadedPhoto } from '@/lib/survey'

interface Props {
  slotIndex: number
  slotName: string
  photos: UploadedPhoto[]
  uploading: boolean
  onUpload: (slotIndex: number, file: File) => Promise<void>
  onDelete: (photoId: string) => Promise<void>
}

export default function PhotoSlot({ slotIndex, slotName, photos, uploading, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const padded = String(slotIndex).padStart(2, '0')

  function triggerUpload() {
    inputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(slotIndex, file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-ghs-green/60 shrink-0">{padded}</span>
        <span className="text-[12px] text-ghs-text leading-tight">{slotName}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {photos.length > 0 && (
            <button
              type="button"
              onClick={triggerUpload}
              disabled={uploading}
              aria-label={`Nog een foto toevoegen voor ${slotName}`}
              className="w-7 h-7 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/40 text-xs transition-colors disabled:opacity-40"
            >
              +
            </button>
          )}
          <button
            type="button"
            onClick={triggerUpload}
            disabled={uploading}
            aria-label={`Foto toevoegen voor ${slotName}`}
            className="w-7 h-7 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/40 text-xs transition-colors disabled:opacity-40"
          >
            {uploading ? '…' : '📷'}
          </button>
        </div>
      </div>

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.fileUrl}
                alt={`${slotName} ${padded}${photos.length > 1 ? String.fromCharCode(97 + i) : ''}`}
                className="w-20 h-16 object-cover rounded-lg border border-white/[0.08]"
              />
              <button
                type="button"
                onClick={() => onDelete(photo.id)}
                aria-label="Foto verwijderen"
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-label={`Bestandsinvoer voor ${slotName}`}
      />
    </div>
  )
}
