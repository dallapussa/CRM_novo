import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">CRM Novo</h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your new CRM system
        </p>
      </div>
    </div>
  )
}
