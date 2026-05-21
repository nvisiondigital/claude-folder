import type { ProjectWithSurvey } from '@/lib/types'
import ProjectCard from './ProjectCard'

const COLUMN_STYLES = {
  CAT1: { dot: 'bg-cat1 shadow-[0_0_6px_rgba(245,158,11,0.5)]', title: 'text-cat1', label: 'CAT 1 — Klaar voor inplanning' },
  CAT2: { dot: 'bg-cat2 shadow-[0_0_6px_rgba(114,217,70,0.5)]', title: 'text-cat2', label: 'CAT 2 — Opmeting intern' },
  CAT3: { dot: 'bg-cat3 shadow-[0_0_6px_rgba(56,189,248,0.5)]',  title: 'text-cat3', label: 'CAT 3 — Extern' },
}

interface Props {
  category: 'CAT1' | 'CAT2' | 'CAT3'
  projects: ProjectWithSurvey[]
  onSelect: (p: ProjectWithSurvey) => void
}

export default function KanbanColumn({ category, projects, onSelect }: Props) {
  const style = COLUMN_STYLES[category]
  return (
    <div className="flex-1 bg-white/[0.025] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
      <div className="px-3.5 py-3 flex items-center gap-2 border-b border-white/[0.05]">
        <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
        <span className={`text-[11px] font-bold ${style.title}`}>{style.label}</span>
        <span className="ml-auto bg-white/[0.07] rounded-full px-2 py-0.5 text-[10px] text-white/35">
          {projects.length}
        </span>
      </div>
      <div className="p-2.5 flex flex-col gap-2 flex-1 overflow-y-auto">
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onSelect={onSelect} />
        ))}
        {projects.length === 0 && (
          <p className="text-[10px] text-white/15 text-center py-6">Geen projecten</p>
        )}
      </div>
    </div>
  )
}
