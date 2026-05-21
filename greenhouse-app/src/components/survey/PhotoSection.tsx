// src/components/survey/PhotoSection.tsx
'use client'

import type { PhotoSectionDef, UploadedPhoto } from '@/lib/survey'
import PhotoSlot from './PhotoSlot'

interface Props {
  section: PhotoSectionDef
  photosBySlot: Record<number, UploadedPhoto[]>
  uploadingSlot: number | null
  onUpload: (slotIndex: number, file: File) => Promise<void>
  onDelete: (photoId: string) => Promise<void>
}

export default function PhotoSection({ section, photosBySlot, uploadingSlot, onUpload, onDelete }: Props) {
  return (
    <div id={`section-${section.key}`} className="scroll-mt-4">
      <h3 className="text-[10px] uppercase tracking-widest text-white/25 mb-3 pt-2">{section.label}</h3>
      <div className="flex flex-col gap-2.5">
        {section.slots.map(slot => (
          <PhotoSlot
            key={slot.index}
            slotIndex={slot.index}
            slotName={slot.name}
            photos={photosBySlot[slot.index] ?? []}
            uploading={uploadingSlot === slot.index}
            onUpload={onUpload}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
