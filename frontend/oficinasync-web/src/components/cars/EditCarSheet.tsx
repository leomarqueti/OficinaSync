import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/fields/FieldShell";
import { PlateField } from "@/components/fields/PlateField";
import { YearField } from "@/components/fields/YearField";
import { KmField } from "@/components/fields/KmField";
import { apiFetch } from "@/lib/api";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const fuelOptions = [
  { value: "flex", label: "Flex" },
  { value: "gasolina", label: "Gasolina" },
  { value: "diesel", label: "Diesel" },
  { value: "eletrico", label: "Elétrico" },
];

export type EditableCar = {
  car_id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: string;
  color: string;
  mileage_in: number;
};

type EditCarSheetProps = {
  car: EditableCar | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export function EditCarSheet({ car, onClose, onSaved }: EditCarSheetProps) {
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("flex");
  const [color, setColor] = useState("");
  const [mileageIn, setMileageIn] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!car) return;
    setPlate(car.plate);
    setBrand(car.brand);
    setModel(car.model);
    setYear(String(car.year));
    setFuelType(car.fuel_type);
    setColor(car.color);
    setMileageIn(String(car.mileage_in));
  }, [car]);

  const submit = async () => {
    if (!car) return;

    try {
      setSaving(true);
      await apiFetch(`/cars/${car.car_id}`, {
        method: "PATCH",
        json: {
          plate: plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
          brand: brand.trim(),
          model: model.trim(),
          year: Number(year),
          fuel_type: fuelType,
          color: color.trim(),
          mileage_in: Number(mileageIn),
        },
      });
      toast.success("Veículo atualizado!");
      onClose();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={car !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Editar veículo</SheetTitle>
          <SheetDescription>Corrija os dados do veículo.</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-1 gap-4 px-4 pb-8 sm:grid-cols-2">
          <PlateField value={plate} onChange={setPlate} />
          <YearField value={year} onChange={setYear} />

          <FieldShell label="Marca" htmlFor="edit-brand">
            <input
              id="edit-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Modelo" htmlFor="edit-model">
            <input
              id="edit-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Combustível" htmlFor="edit-fuel">
            <select
              id="edit-fuel"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className={inputClass}
            >
              {fuelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label="Cor" htmlFor="edit-color">
            <input
              id="edit-color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <KmField value={mileageIn} onChange={setMileageIn} />

          <div className="flex gap-2 pt-2 sm:col-span-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button className="h-11" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
