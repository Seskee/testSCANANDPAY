import { Outlet } from "react-router-dom"
import { Header } from "./Header"

export function Layout() {
  return (
    <div className="bg-gradient-to-br from-background to-secondary">
      <Header />
      <div className="pt-16">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}