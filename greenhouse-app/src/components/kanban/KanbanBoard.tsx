'use client'

import useSWR from 'swr'
import type { ProjectWithSurvey } from '@/lib/types'
import KanbanColumn from './KanbanColumn'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
})

interface Props {
  onSelect: (p: ProjectWithSurvey) => void
  onAdd: () => void
}

export default function KanbanBoard({ onSelect, onAdd }: Props) {
  const { data: projects = [], isLoading, error } = useSWR<ProjectWithSurvey[]>('/api/projects', fetcher, {
    refreshInterval: 30_000,
  })

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm">Laden...</div>
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        Fout bij laden van projecten. Probeer de pagina te verversen.
      </div>
    )
  }

  const byCategory = (cat: 'CAT1' | 'CAT2' | 'CAT3') =>
    projects.filter(p => p.category === cat)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3 bg-ghs-surface">
        <div>
          <h1 className="text-sm font-bold text-white">Mijn kanban</h1>
          <p className="text-[11px] text-white/30 mt-0.5">{projects.length} actieve projecten</p>
        </div>
        <button
          onClick={onAdd}
          className="ml-auto bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg px-4 py-2 text-xs shadow-[0_0_14px_rgba(114,217,70,0.2)] hover:shadow-[0_0_20px_rgba(114,217,70,0.35)] transition-shadow"
        >
          + Project toevoegen
        </button>
      </div>

      {/* Columns */}
      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        <KanbanColumn category="CAT1" projects={byCategory('CAT1')} onSelect={onSelect} />
        <KanbanColumn category="CAT2" projects={byCategory('CAT2')} onSelect={onSelect} />
        <KanbanColumn category="CAT3" projects={byCategory('CAT3')} onSelect={onSelect} />
      </div>
    </div>
  )
}
