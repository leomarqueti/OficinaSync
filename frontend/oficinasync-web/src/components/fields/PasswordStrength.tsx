import { Check, X } from "lucide-react";
import { passwordRules } from "@/lib/validators";

const rules: { key: keyof ReturnType<typeof passwordRules>; label: string }[] = [
  { key: "length", label: "8+ caracteres" },
  { key: "lowercase", label: "1 letra minúscula" },
  { key: "uppercase", label: "1 letra maiúscula" },
  { key: "number", label: "1 número" },
  { key: "symbol", label: "1 símbolo (!@#$...)" },
];

/** Checklist ao vivo das regras de senha — some assim que a senha fica vazia. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const status = passwordRules(password);

  return (
    <div className="grid grid-cols-1 gap-1 rounded-lg bg-muted/30 p-3 sm:grid-cols-2">
      {rules.map((rule) => {
        const ok = status[rule.key];
        return (
          <span
            key={rule.key}
            className={`flex items-center gap-1.5 text-xs font-medium ${
              ok ? "text-brand" : "text-muted-foreground"
            }`}
          >
            {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {rule.label}
          </span>
        );
      })}
    </div>
  );
}
