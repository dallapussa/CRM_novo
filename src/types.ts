export type Client = {
  id: string
  name: string
  contact_email?: string | null
  status?: string | null
  created_at?: string | null
}

export type Lead = {
  id: string
  name: string
  company_name?: string | null
  status?: string | null
  created_at?: string | null
}

export type Extinguisher = {
  id: string
  code: string
  type?: string | null
  status?: string | null
  created_at?: string | null
}

export type User = {
  id: string
  name: string
  email: string
  role?: string | null
  created_at?: string | null
}
