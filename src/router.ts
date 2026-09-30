import { Router } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as dashboardRoute } from './routes/index'
import { Route as loginRoute } from './routes/login'
import { Route as clientsRoute } from './routes/clients'
import { Route as leadsRoute } from './routes/leads'
import { Route as extinguishersRoute } from './routes/extinguishers'
import { Route as usersRoute } from './routes/users'

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  clientsRoute,
  leadsRoute,
  extinguishersRoute,
  usersRoute,
])

export const router = new Router({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
