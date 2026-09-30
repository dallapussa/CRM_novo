import { supabase } from './supabase'
import type { Client, Extinguisher, Lead, User } from '../types'

export async function fetchClients(): Promise<Client[]> {
  return selectRows<Client>('clients')
}

export async function fetchLeads(): Promise<Lead[]> {
  return selectRows<Lead>('leads')
}

export async function fetchExtinguishers(): Promise<Extinguisher[]> {
  return selectRows<Extinguisher>('extinguishers')
}

export async function fetchUsers(): Promise<User[]> {
  return selectRows<User>('users')
}

async function selectRows<T>(tableName: string): Promise<T[]> {
  const { data, error } = await supabase.from(tableName).select('*')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as T[]
}
