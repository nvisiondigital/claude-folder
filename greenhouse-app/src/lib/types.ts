import type { Project, Category, ProjectStatus } from '@prisma/client'

export type { Project, Category, ProjectStatus }

export type CreateProjectInput = {
  clientName: string
  email: string
  phone: string
  street: string
  postalCode: string
  city: string
  category: Category
  panelCount?: number
  roofType?: string
  description?: string
  sellerNotes?: string
  appointmentDate?: string // ISO string
}

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  status?: ProjectStatus
}

export type SurveyStub = {
  id: string
  isDraft: boolean
}

export type ProjectWithSurvey = Project & {
  survey: SurveyStub | null
}
