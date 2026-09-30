import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../components/app-shell'
import { fetchExtinguishers } from '../lib/crm'

export const Route = createFileRoute('/extinguishers')({
  component: ExtinguishersPage,
})

function ExtinguishersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['extinguishers'],
    queryFn: fetchExtinguishers,
  })

  return (
    <AppShell title="Extintores" subtitle="Controle de equipamentos e inventário">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando extintores...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Erro: {error.message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-center text-slate-500">
                      Nenhum extintor encontrado.
                    </td>
                  </tr>
                ) : (
                  (data ?? []).map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{item.code}</td>
                      <td className="px-4 py-3">{item.type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                          {item.status ?? 'disponível'}
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
