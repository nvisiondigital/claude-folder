import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import ContractorPageClient from './ContractorPageClient'

export default async function ContractorPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value
  if (!token) redirect('/contractor/login')
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'contractor') redirect('/contractor/login')

  return <ContractorPageClient />
}
