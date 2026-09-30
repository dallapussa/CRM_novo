import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../components/app-shell'
import {
  fetchClients,
  fetchExtinguishers,
  fetchLeads,
  fetchUsers,
} from '../lib/crm'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const clientsQuery = useQuery({ queryKey: ['clients'], queryFn: fetchClients })
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: fetchLeads })
  const extinguishersQuery = useQuery({
    queryKey: ['extinguishers'],
    queryFn: fetchExtinguishers,
  })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const stats = [
    {
      label: 'Clientes',
      value: clientsQuery.data?.length ?? 0,
      hint: 'Ativos',
    },
    {
      label: 'Leads',
      value: leadsQuery.data?.length ?? 0,
      hint: 'Em pipeline',
    },
    {
      label: 'Extintores',
      value: extinguishersQuery.data?.length ?? 0,
      hint: 'Em estoque',
    },
    {
      label: 'Usuários',
      value: usersQuery.data?.length ?? 0,
      hint: 'Acesso ao sistema',
    },
  ]

  return (
    <AppShell title="Dashboard" subtitle="Visão geral do CRM">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-3xl font-semibold text-slate-900">{stat.value}</span>
              <span className="text-xs text-slate-500">{stat.hint}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Resumo operacional</h2>
          <p className="mt-3 text-sm text-slate-600">
            Os dados são carregados em tempo real quando houver conexão com o Supabase.
            Nenhum dado fiscal ou de negócio é armazenado em localStorage.
          </p>
        </section>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Status da integração</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Supabase: configurado via variável de ambiente</li>
            <li>• TanStack Query: ativo para leitura de dados</li>
            <li>• RLS: deve ser aplicado por tabela no banco</li>
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
