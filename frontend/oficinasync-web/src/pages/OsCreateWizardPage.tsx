import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WizardShell } from "@/components/wizard/WizardShell";
import { EntryPhotoSlot } from "@/components/wizard/EntryPhotoSlot";
import { PhoneField } from "@/components/fields/PhoneField";
import { CpfField } from "@/components/fields/CpfField";
import { PlateField } from "@/components/fields/PlateField";
import { YearField } from "@/components/fields/YearField";
import { KmField } from "@/components/fields/KmField";
import { FieldShell } from "@/components/fields/FieldShell";
import { apiFetch } from "@/lib/api";
import {
  e164ToDigits,
  formatPhone,
  isValidCpf,
  isValidPhone,
  isValidPlate,
  isValidYear,
  onlyDigits,
} from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const fuelOptions = [
  { value: "flex", label: "Flex" },
  { value: "gasolina", label: "Gasolina" },
  { value: "diesel", label: "Diesel" },
  { value: "eletrico", label: "Elétrico" },
];

const photoLabels = {
  front: "Frente do veículo",
  rear: "Traseira do veículo",
  left: "Lado esquerdo do veículo",
  right: "Lado direito do veículo",
} as const;

type PhotoKey = keyof typeof photoLabels;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OsCreateWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // passo 1 — cliente
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // passo 2 — veículo
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("flex");
  const [color, setColor] = useState("");
  const [chassis, setChassis] = useState("");
  const [mileageIn, setMileageIn] = useState("");

  // passo 3 — defeito relatado
  const [complaint, setComplaint] = useState("");

  // passo 4 — fotos de entrada
  const [photos, setPhotos] = useState<Record<PhotoKey, File | null>>({
    front: null,
    rear: null,
    left: null,
    right: null,
  });

  const stepCount = 5;

  const clientValid =
    name.trim().length >= 2 &&
    isValidPhone(e164ToDigits(phone)) &&
    isValidCpf(cpf) &&
    emailRegex.test(email) &&
    address.trim().length >= 3;

  const carValid =
    isValidPlate(plate) &&
    brand.trim().length >= 2 &&
    model.trim().length >= 1 &&
    isValidYear(year) &&
    color.trim().length >= 2 &&
    chassis.trim().length >= 5 &&
    mileageIn.length > 0;

  const complaintValid = complaint.trim().length >= 5;

  const photosValid = Object.values(photos).every((f) => f !== null);

  const canAdvance = [clientValid, carValid, complaintValid, photosValid, true][step];

  const goBack = () => {
    if (step === 0) {
      navigate("/dashboard");
      return;
    }
    setStep((s) => s - 1);
  };

  const goNext = () => {
    if (step < stepCount - 1) {
      setStep((s) => s + 1);
      return;
    }
    submitAll();
  };

  const uploadPhoto = async (file: File, label: string, sectionId: number) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("section_id", String(sectionId));
    formData.append("type", "photo");
    formData.append("label", label);
    await apiFetch("/medias", { method: "POST", body: formData });
  };

  const submitAll = async () => {
    try {
      setSubmitting(true);

      const client = await apiFetch<{ client_id: number }>("/clients", {
        method: "POST",
        json: {
          name: name.trim(),
          phone,
          email: email.trim(),
          cpf: onlyDigits(cpf),
          address: address.trim(),
        },
      });

      const car = await apiFetch<{ car_id: number }>("/cars", {
        method: "POST",
        json: {
          plate: plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
          brand: brand.trim(),
          model: model.trim(),
          year: Number(year),
          fuel_type: fuelType,
          chassis: chassis.trim().toUpperCase(),
          color: color.trim(),
          mileage_in: Number(mileageIn),
          client_id: client.client_id,
        },
      });

      const serviceOrder = await apiFetch<{ service_order_id: number }>("/service_orders", {
        method: "POST",
        json: {
          car_id: car.car_id,
          client_complaint: complaint.trim(),
        },
      });

      const section = await apiFetch<{ section_id: number }>("/sections", {
        method: "POST",
        json: {
          service_order_id: serviceOrder.service_order_id,
          type: "checkin",
          notes: "Registro fotográfico da entrada do veículo.",
        },
      });

      await Promise.all(
        (Object.keys(photoLabels) as PhotoKey[]).map((key) =>
          uploadPhoto(photos[key] as File, photoLabels[key], section.section_id),
        ),
      );

      await apiFetch(`/sections/${section.section_id}/publish`, { method: "PATCH" });

      toast.success("OS criada com sucesso!");
      navigate(`/os/${serviceOrder.service_order_id}`);
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 0) {
    return (
      <WizardShell
        stepIndex={0}
        stepCount={stepCount}
        title="Quem é o cliente?"
        subtitle="Dados de contato — usados pra localizar o cliente em futuras visitas."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="space-y-4">
          <FieldShell label="Nome completo" htmlFor="name">
            <input
              id="name"
              type="text"
              placeholder="Ex: Diogo Deleon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <PhoneField value={phone} onChange={setPhone} />
          <CpfField value={cpf} onChange={setCpf} />

          <FieldShell label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              placeholder="ex: cliente@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Endereço" htmlFor="address">
            <input
              id="address"
              type="text"
              placeholder="Rua, número, bairro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </FieldShell>
        </div>
      </WizardShell>
    );
  }

  if (step === 1) {
    return (
      <WizardShell
        stepIndex={1}
        stepCount={stepCount}
        title="Qual é o veículo?"
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PlateField value={plate} onChange={setPlate} />
          <YearField value={year} onChange={setYear} />

          <FieldShell label="Marca" htmlFor="brand">
            <input
              id="brand"
              type="text"
              placeholder="Ex: Volkswagen"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Modelo" htmlFor="model">
            <input
              id="model"
              type="text"
              placeholder="Ex: Gol 1.0"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Combustível" htmlFor="fuel">
            <select
              id="fuel"
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

          <FieldShell label="Cor" htmlFor="color">
            <input
              id="color"
              type="text"
              placeholder="Ex: Prata"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Chassi" htmlFor="chassis">
            <input
              id="chassis"
              type="text"
              placeholder="Ex: 9BWZZZ377VT004251"
              value={chassis}
              onChange={(e) => setChassis(e.target.value.toUpperCase())}
              className={`${inputClass} uppercase`}
            />
          </FieldShell>

          <KmField value={mileageIn} onChange={setMileageIn} />
        </div>
      </WizardShell>
    );
  }

  if (step === 2) {
    return (
      <WizardShell
        stepIndex={2}
        stepCount={stepCount}
        title="Qual é o defeito relatado?"
        subtitle="Descreva com as palavras do cliente — isso aparece no laudo e na página dele."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <textarea
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="Ex: veículo falha ao ligar de manhã, painel oscila e a bateria descarrega com frequência..."
          maxLength={500}
          className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          {complaint.length}/500
        </p>
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        stepIndex={3}
        stepCount={stepCount}
        title="Fotos de entrada"
        subtitle="As 4 fotos principais registram como o veículo chegou — aparecem logo no início da história do cliente."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(photoLabels) as PhotoKey[]).map((key) => (
            <EntryPhotoSlot
              key={key}
              label={photoLabels[key]}
              file={photos[key]}
              onCapture={(file) => setPhotos((prev) => ({ ...prev, [key]: file }))}
            />
          ))}
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      stepIndex={4}
      stepCount={stepCount}
      title="Confere e cria a OS"
      subtitle="Revise os dados — depois de criar, tudo continua editável na tela do mecânico."
      onBack={goBack}
      onNext={goNext}
      nextLabel="Criar ordem de serviço"
      loading={submitting}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Cliente
          </p>
          <p className="mt-1 text-sm text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            {formatPhone(e164ToDigits(phone))} · {email}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Veículo
          </p>
          <p className="mt-1 text-sm text-foreground">
            {brand} {model} · {year} · {color}
          </p>
          <p className="text-sm text-muted-foreground">
            {plate.toUpperCase()} · {mileageIn ? Number(mileageIn).toLocaleString("pt-BR") : 0} km
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Defeito relatado
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{complaint}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Fotos de entrada
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(Object.keys(photoLabels) as PhotoKey[]).map((key) => {
              const file = photos[key];
              return (
                <div
                  key={key}
                  className="aspect-square overflow-hidden rounded-lg border border-border bg-muted/20"
                >
                  {file && (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={photoLabels[key]}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
