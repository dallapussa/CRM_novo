import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Clientes', to: '/clients' },
  { label: 'Leads', to: '/leads' },
  { label: 'Extintores', to: '/extinguishers' },
  { label: 'Usuários', to: '/users' },
  { label: 'Login', to: '/login' },
]

type AppShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-72 border-r border-slate-200 bg-slate-900 text-slate-100 md:block">
        <div className="border-b border-slate-700 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-2 text-2xl font-semibold">Novo</h1>
        </div>

        <nav className="space-y-1 p-4">
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              activeProps={{ className: 'bg-slate-800 text-white' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">CRM</p>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
