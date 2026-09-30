import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../components/app-shell'
import { fetchUsers } from '../lib/crm'

export const Route = createFileRoute('/users')({
  component: UsersPage,
})

function UsersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  return (
    <AppShell title="Usuários" subtitle="Controle de acesso e permissões">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando usuários...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Erro: {error.message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-center text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  (data ?? []).map((user) => (
                    <tr key={user.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                          {user.role ?? 'usuario'}
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
