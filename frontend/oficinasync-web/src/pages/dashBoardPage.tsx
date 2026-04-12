import { CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function DashboardPage() {
  return (
    <>
      <Sidebar>
        <SidebarHeader />
        <SidebarContent>
          <SidebarGroup />
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>

      <SidebarInset>
        <main className="p-4">
          <SidebarTrigger />
          <h1>Dashboard</h1>

          <CardHeader className="p-6 text-center w-70 text-left gap-3">
            <CardTitle className="text-3xl font-bold tracking-tight">
                Em desenvolvimento
            </CardTitle>
        </CardHeader>
        </main>
      </SidebarInset>
    </>
  )
}