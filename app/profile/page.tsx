import { Header } from "@/components/ui/header"
import { UserProfileComponent } from "@/components/auth/user-profile"

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto py-12">
          <UserProfileComponent />
        </div>
      </main>
    </div>
  )
}

