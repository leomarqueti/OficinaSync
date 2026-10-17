import { Car, Home, LogOut, Percent, Radio, Settings, Users, Wrench } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandLogo, BrandSymbol } from "@/components/brand/BrandLogo";
import { ModeSwitch } from "@/components/shell/ModeSwitch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { isOfficeRole, useMe } from "@/lib/me";
import { logout } from "@/lib/session";

type Item = { to: string; label: string; icon: typeof Home; show?: boolean };

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { me } = useMe();

  const items: Item[] = [
    { to: "/dashboard", label: "Início", icon: Home },
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/veiculos", label: "Veículos", icon: Car },
    { to: "/equipe", label: "Equipe", icon: Wrench, show: me?.role === "owner" },
    { to: "/comissoes", label: isOfficeRole(me?.role) ? "Comissões" : "Minhas comissões", icon: Percent },
    { to: "/scanner", label: "Scanner", icon: Radio, show: import.meta.env.VITE_FEATURE_OBD === "true" },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-white/5">
        <div className="flex items-center gap-2 px-2 py-2">
          <BrandLogo size="sm" className="group-data-[collapsible=icon]:hidden" />
          <BrandSymbol className="hidden h-8 w-8 group-data-[collapsible=icon]:block" title="OficinaSync" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter((item) => item.show !== false)
                .map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      className="h-11 text-[15px]"
                      isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                      onClick={() => navigate(item.to)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5">
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <ModeSwitch className="w-full justify-center" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-11" onClick={() => logout(navigate)}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
