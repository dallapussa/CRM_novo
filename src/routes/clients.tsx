import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../components/app-shell'
import { fetchClients } from '../lib/crm'

export const Route = createFileRoute('/clients')({
  component: ClientsPage,
})

function ClientsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  return (
    <AppShell title="Clientes" subtitle="Visualização e gestão de clientes">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando clientes...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Erro: {error.message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-center text-slate-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  (data ?? []).map((client) => (
                    <tr key={client.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{client.name}</td>
                      <td className="px-4 py-3">{client.contact_email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          {client.status ?? 'ativo'}
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
