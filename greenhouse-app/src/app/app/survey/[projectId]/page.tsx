// src/app/app/survey/[projectId]/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import SurveyPageClient from './SurveyPageClient'

type Props = { params: Promise<{ projectId: string }> }

export default async function SurveyPage({ params }: Props) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    redirect('/login')
  }

  const { projectId } = await params
  return <SurveyPageClient projectId={projectId} />
}
