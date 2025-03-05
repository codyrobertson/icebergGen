import { SystemHealth } from "@/components/admin/system-health"
import { DbHealthCheck } from "@/components/admin/db-health-check"

export default function AdminPage() {
  return (
    <div className="container max-w-5xl py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Database Health</h2>
          <DbHealthCheck />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">System Health</h2>
          <SystemHealth />
        </section>
      </div>
    </div>
  )
}

