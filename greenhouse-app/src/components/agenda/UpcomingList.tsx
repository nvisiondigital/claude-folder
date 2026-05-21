'use client'

import useSWR from 'swr'
import type { Project } from '@prisma/client'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
})

const CAT_COLOURS: Record<string, string> = {
  CAT1: 'text-cat1 border-cat1/20 bg-cat1/[0.07]',
  CAT2: 'text-cat2 border-cat2/20 bg-cat2/[0.07]',
  CAT3: 'text-cat3 border-cat3/20 bg-cat3/[0.07]',
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export default function UpcomingList() {
  const { data: projects = [], isLoading, error } = useSWR<Project[]>('/api/projects/upcoming', fetcher)

  if (isLoading) return <div className="p-3 text-[10px] text-white/20">Laden...</div>
  if (error) return <div className="p-3 text-[10px] text-red-400">Fout bij laden.</div>

  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1">
      {projects.length === 0 && (
        <p className="text-[10px] text-white/15 text-center py-6">
          Geen afspraken komende 2 weken
        </p>
      )}
      {projects.map(p => (
        <div key={p.id} className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-2.5 hover:border-white/15 cursor-pointer transition-colors">
          <div className="text-[9px] text-white/25 mb-1.5">
            📅 {p.appointmentDate ? formatDate(p.appointmentDate as unknown as string) : '—'}
          </div>
          <div className="text-[11px] font-semibold text-white/75 mb-0.5">{p.clientName}</div>
          <div className="text-[10px] text-white/30">{p.city}</div>
          <span className={`inline-flex mt-1.5 text-[9px] border rounded-full px-2 py-0.5 ${CAT_COLOURS[p.category]}`}>
            {p.category} — {p.category === 'CAT2' ? 'Florian' : p.category === 'CAT3' ? 'Aannemer' : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
