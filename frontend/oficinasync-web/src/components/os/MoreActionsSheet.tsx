import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { haptic } from "@/lib/haptics";

export type MoreAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** texto ao lado (ex.: "Gerando...") */
  detail?: string;
  disabled?: boolean;
  tone?: "default" | "brand";
};

/** "⋯ Mais ações": tudo que não é o trabalho do dia a dia fica aqui, em botões grandes. */
export function MoreActionsSheet({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: MoreAction[] }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Mais ações</SheetTitle>
          <SheetDescription className="sr-only">Outras ações desta OS</SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-2 px-4 pb-8">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                disabled={a.disabled}
                onClick={() => {
                  haptic();
                  onClose();
                  a.onClick();
                }}
                className={
                  a.tone === "brand"
                    ? "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-brand px-4 text-left font-bold text-brand-foreground disabled:opacity-50 [&_svg]:h-6 [&_svg]:w-6"
                    : "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.06] px-4 text-left font-semibold disabled:opacity-50 [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-brand"
                }
              >
                <span aria-hidden="true">{a.icon}</span>
                {a.label}
                {a.detail && <span className="ml-auto text-sm font-normal opacity-70">{a.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
