import { Home, Plus, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { ModeSwitch } from "./ModeSwitch";

const NAV = [
  { to: "/dashboard", label: "Início", icon: Home, match: (p: string) => p === "/dashboard" },
  { to: "/veiculos", label: "Buscar", icon: Search, match: (p: string) => p.startsWith("/veiculos") || p.startsWith("/clientes") },
  { to: "/configuracoes", label: "Eu", icon: UserRound, match: (p: string) => p.startsWith("/configuracoes") || p.startsWith("/comissoes") },
] as const;

function NavButton({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => navigate(item.to)}
      className={cn(
        "flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold",
        active ? "text-brand" : "text-white/70",
      )}
    >
      <item.icon className="h-7 w-7" aria-hidden="true" />
      {item.label}
    </button>
  );
}

/** Modo simples (mecânico): logo no topo, conteúdo, barra fixa embaixo com botões grandes. */
export function SimpleShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [home, search, me] = NAV;

  return (
    <div className="app-glow min-h-screen text-foreground">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <BrandLogo size="sm" />
        <ModeSwitch />
      </header>

      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))]">{children}</main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0a0a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex h-20 max-w-xl items-center justify-around px-2">
          <li>
            <NavButton item={home} active={home.match(pathname)} />
          </li>
          <li>
            <NavButton item={search} active={search.match(pathname)} />
          </li>
          <li>
            <button
              type="button"
              data-tour="new-os"
              aria-label="Abrir carro novo"
              onClick={() => {
                haptic();
                navigate("/os-client-create");
              }}
              className="-mt-8 flex h-[72px] w-[72px] flex-col items-center justify-center rounded-3xl bg-brand font-display text-xs font-extrabold uppercase text-brand-foreground shadow-[0_12px_28px_-8px_rgba(163,230,53,.6)] transition-transform active:scale-95"
            >
              <Plus className="h-8 w-8" aria-hidden="true" />
              Carro
            </button>
          </li>
          <li>
            <NavButton item={me} active={me.match(pathname)} />
          </li>
        </ul>
      </nav>
    </div>
  );
}
