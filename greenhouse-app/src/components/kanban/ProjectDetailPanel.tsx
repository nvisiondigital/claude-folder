import type { Project } from '@prisma/client'

interface Props {
  project: Project
  onClose: () => void
}

export default function ProjectDetailPanel({ project, onClose }: Props) {
  return (
    <aside className="w-96 shrink-0 bg-ghs-surface border-l border-white/[0.06] flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
        <h2 className="text-sm font-bold text-white">{project.clientName}</h2>
        <button
          aria-label="Sluiten"
          onClick={onClose}
          className="ml-auto w-7 h-7 flex items-center justify-center bg-white/[0.05] rounded-lg text-white/40 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center text-ghs-muted text-xs">
        Detail panel — komt in Task 9
      </div>
    </aside>
  )
}
