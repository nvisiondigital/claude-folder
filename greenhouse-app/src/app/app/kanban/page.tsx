'use client'

import { useState } from 'react'
import type { ProjectWithSurvey } from '@/lib/types'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import AddProjectModal from '@/components/kanban/AddProjectModal'

export default function KanbanPage() {
  const [selected, setSelected] = useState<ProjectWithSurvey | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="flex h-full overflow-hidden">
      <KanbanBoard onSelect={setSelected} onAdd={() => setShowAdd(true)} />
      {selected && (
        <ProjectDetailPanel project={selected} onClose={() => setSelected(null)} />
      )}
      {showAdd && (
        <AddProjectModal onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
