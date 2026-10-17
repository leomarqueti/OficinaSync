import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

/** Modo controle (escritório/dono): menu lateral + conteúdo. */
export function ControlShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/5 bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger className="h-11 w-11" />
          <BrandLogo size="sm" className="md:hidden" />
        </header>
        <div className="app-glow min-h-[calc(100vh-3.5rem)]">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
