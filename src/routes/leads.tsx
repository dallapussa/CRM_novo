import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../components/app-shell'
import { fetchLeads } from '../lib/crm'

export const Route = createFileRoute('/leads')({
  component: LeadsPage,
})

function LeadsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  })

  return (
    <AppShell title="Leads" subtitle="Pipeline de prospecção e conversão">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando leads...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Erro: {error.message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-center text-slate-500">
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                ) : (
                  (data ?? []).map((lead) => (
                    <tr key={lead.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{lead.name}</td>
                      <td className="px-4 py-3">{lead.company_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          {lead.status ?? 'novo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  )
}
