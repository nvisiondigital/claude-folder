// src/components/survey/SurveyForm.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  PHOTO_SECTIONS,
  EMPTY_MEASUREMENTS,
  type UploadedPhoto,
  type SurveyMeasurements,
} from '@/lib/survey'
import PhotoSection from './PhotoSection'
import MeasurementFields from './MeasurementFields'

interface Props {
  projectId: string
  projectName: string
  initialPhotos: UploadedPhoto[]
  initialMeasurements: SurveyMeasurements
  isDraft: boolean
  onSave: (measurements: SurveyMeasurements, isDraft: boolean) => Promise<void>
  onBack: () => void
}

export default function SurveyForm({
  projectId, projectName, initialPhotos, initialMeasurements, isDraft, onSave, onBack,
}: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPhotos)
  const [measurements, setMeasurements] = useState<SurveyMeasurements>(
    initialMeasurements ?? EMPTY_MEASUREMENTS
  )
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pageUrl, setPageUrl] = useState('')

  useEffect(() => { setPageUrl(window.location.href) }, [])

  function copyUrl() {
    navigator.clipboard.writeText(pageUrl).catch(() => {})
  }

  const photosBySlot: Record<number, UploadedPhoto[]> = {}
  for (const p of photos) {
    if (!photosBySlot[p.slotIndex]) photosBySlot[p.slotIndex] = []
    photosBySlot[p.slotIndex].push(p)
  }

  const handleUpload = useCallback(async (slotIndex: number, file: File) => {
    setUploadingSlot(slotIndex)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slotIndex', String(slotIndex))
      const res = await fetch(`/api/surveys/${projectId}/photos`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload mislukt')
      const photo: UploadedPhoto = await res.json()
      setPhotos(prev => [...prev, photo])
    } finally {
      setUploadingSlot(null)
    }
  }, [projectId])

  const handleDelete = useCallback(async (photoId: string) => {
    const res = await fetch(`/api/surveys/${projectId}/photos/${photoId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Verwijderen mislukt')
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }, [projectId])

  async function handleSave(finalize: boolean) {
    setSaving(true)
    try {
      await onSave(measurements, !finalize)
    } finally {
      setSaving(false)
    }
  }

  const hasDronePhotos = photos.some(p => p.slotIndex >= 19 && p.slotIndex <= 23)

  return (
    <div className="flex flex-col h-full bg-ghs-bg">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-3 bg-ghs-surface shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          ← Terug
        </button>
        <h1 className="text-sm font-bold text-white truncate">{projectName}</h1>
        <span className="text-[10px] text-white/30">Opmeting</span>
        {isDraft && (
          <span className="ml-auto shrink-0 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">
            Concept
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Section nav */}
        <nav className="hidden lg:flex w-44 shrink-0 flex-col gap-0.5 p-3 border-r border-white/[0.05] overflow-y-auto">
          {PHOTO_SECTIONS.map(section => (
            <a
              key={section.key}
              href={`#section-${section.key}`}
              className="text-[11px] text-white/35 hover:text-white/70 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              {section.label}
            </a>
          ))}
          <a
            href="#section-measurements"
            className="text-[11px] text-white/35 hover:text-white/70 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            Metingen
          </a>
        </nav>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 pb-28">
          {PHOTO_SECTIONS.map(section => (
            <PhotoSection
              key={section.key}
              section={section}
              photosBySlot={photosBySlot}
              uploadingSlot={uploadingSlot}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          ))}
          <MeasurementFields values={measurements} onChange={setMeasurements} />
        </div>
      </div>

      {/* Save bar */}
      <div className="shrink-0 border-t border-white/[0.05] bg-ghs-surface px-5 py-3.5 flex items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] text-white/25">
          <span>📱</span>
          <span className="hidden sm:inline">Open op telefoon:</span>
          <button
            type="button"
            onClick={copyUrl}
            className="bg-white/[0.05] hover:bg-white/10 px-2 py-0.5 rounded text-[10px] text-white/40 transition-colors"
          >
            Kopieer link
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="bg-white/[0.05] border border-white/[0.08] hover:bg-white/10 rounded-lg px-4 py-2 text-[11px] text-white/60 transition-colors disabled:opacity-40"
          >
            {saving ? 'Opslaan...' : 'Concept opslaan'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || !hasDronePhotos}
            title={!hasDronePhotos ? "Voeg eerst drone foto's toe (slots 19–23)" : undefined}
            className="bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg px-4 py-2 text-[11px] shadow-[0_0_14px_rgba(114,217,70,0.2)] hover:shadow-[0_0_20px_rgba(114,217,70,0.35)] transition-shadow disabled:opacity-40 disabled:shadow-none"
          >
            Opmeting afronden
          </button>
        </div>
      </div>
    </div>
  )
}
