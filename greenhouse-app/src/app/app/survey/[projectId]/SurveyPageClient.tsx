// src/app/app/survey/[projectId]/SurveyPageClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SurveyForm from '@/components/survey/SurveyForm'
import { EMPTY_MEASUREMENTS, type UploadedPhoto, type SurveyMeasurements } from '@/lib/survey'

type ProjectInfo = { id: string; clientName: string; category: string }

type SurveyApiResponse = {
  id: string
  projectId: string
  isDraft: boolean
  submittedAt: string | null
  netspanning: string | null
  hoofdzekering: string | null
  aardingOk: boolean | null
  elektriciteitsOk: boolean | null
  locatieOmvormer: string | null
  soortBevestiging: string | null
  aantalMuurdoorvoeren: number | null
  geschatteLengteDc: string | null
  geschatteLengteAc: string | null
  internet: boolean | null
  internetType: string | null
  samenvatting: string | null
  photos: UploadedPhoto[]
}

function toMeasurements(s: SurveyApiResponse): SurveyMeasurements {
  return {
    netspanning:          s.netspanning          ?? '',
    hoofdzekering:        s.hoofdzekering        ?? '',
    aardingOk:            s.aardingOk,
    elektriciteitsOk:     s.elektriciteitsOk,
    locatieOmvormer:      s.locatieOmvormer      ?? '',
    soortBevestiging:     s.soortBevestiging     ?? '',
    aantalMuurdoorvoeren: s.aantalMuurdoorvoeren != null ? String(s.aantalMuurdoorvoeren) : '',
    geschatteLengteDc:    s.geschatteLengteDc    ?? '',
    geschatteLengteAc:    s.geschatteLengteAc    ?? '',
    internet:             s.internet,
    internetType:         s.internetType         ?? '',
    samenvatting:         s.samenvatting         ?? '',
  }
}

export default function SurveyPageClient({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [survey, setSurvey] = useState<SurveyApiResponse | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/surveys/${projectId}`),
          fetch(`/api/projects/${projectId}`),
        ])
        if (!sRes.ok || !pRes.ok) throw new Error('Load failed')
        const [surveyData, projectData]: [SurveyApiResponse, ProjectInfo] =
          await Promise.all([sRes.json(), pRes.json()])
        setSurvey(surveyData)
        setProject(projectData)
      } catch {
        setError('Kon de opmeting niet laden. Probeer de pagina te verversen.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleSave(measurements: SurveyMeasurements, isDraft: boolean) {
    const res = await fetch(`/api/surveys/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...measurements, isDraft }),
    })
    if (!res.ok) throw new Error('Opslaan mislukt')
    const updated: SurveyApiResponse = await res.json()
    setSurvey(updated)
    if (!isDraft) {
      router.push('/app/kanban')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm">
        Opmeting laden...
      </div>
    )
  }

  if (error || !survey || !project) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        {error ?? 'Onbekende fout'}
      </div>
    )
  }

  return (
    <SurveyForm
      projectId={projectId}
      projectName={project.clientName}
      initialPhotos={survey.photos}
      initialMeasurements={toMeasurements(survey)}
      isDraft={survey.isDraft}
      onSave={handleSave}
      onBack={() => router.push('/app/kanban')}
    />
  )
}
