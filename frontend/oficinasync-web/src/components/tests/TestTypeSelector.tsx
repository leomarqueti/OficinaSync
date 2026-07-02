import { Button } from "@/components/ui/button";
import type { TestTypeCategory } from "./testTypes";
import { testTypeIcons, testTypeLabels } from "./testTypes";

type TestTypeSelectorProps = {
  onSelect: (type: TestTypeCategory | "generic") => void;
};

const specializedTypes: TestTypeCategory[] = [
  "compressao_mecanica",
  "leitura_dtc",
  "bateria",
  "injetores_banco",
];

export function TestTypeSelector({ onSelect }: TestTypeSelectorProps) {
  return (
    <div className="space-y-3 rounded-2xl border bg-background p-4">
      <div>
        <h3 className="font-medium">Que tipo de teste você fez?</h3>
        <p className="text-sm text-muted-foreground">
          Escolha um tipo pra usar o formulário certo, ou "Outro teste" pra um formulário livre.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {specializedTypes.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            className="h-16 flex-col gap-1 text-sm"
            onClick={() => onSelect(type)}
          >
            <span className="text-xl">{testTypeIcons[type]}</span>
            {testTypeLabels[type]}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          className="h-16 flex-col gap-1 text-sm"
          onClick={() => onSelect("generic")}
        >
          <span className="text-xl">📝</span>
          Outro teste
        </Button>
      </div>
    </div>
  );
}
