import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Car, Check, ChevronDown, ChevronUp, Loader2, Mic, Plus, Search, Trash2, Video, X } from "lucide-react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { EntryPhotoSlot } from "@/components/wizard/EntryPhotoSlot";
import { PhoneField } from "@/components/fields/PhoneField";
import { CpfField } from "@/components/fields/CpfField";
import { PlateField } from "@/components/fields/PlateField";
import { YearField } from "@/components/fields/YearField";
import { KmField } from "@/components/fields/KmField";
import { FieldShell } from "@/components/fields/FieldShell";
import { MediaCaptureField, type MediaCaptureType } from "@/components/media/MediaCaptureField";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { CAR_BRANDS, OTHER_BRAND } from "@/lib/carBrands";
import { intakeQuestions } from "@/lib/intakeQuestions";
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

const clientMediaLabels: Record<MediaCaptureType, string> = {
  photo: "Foto enviada pelo cliente",
  video: "Vídeo enviado pelo cliente",
  audio: "Áudio enviado pelo cliente",
};

type ClientMediaItem = {
  id: string;
  type: MediaCaptureType;
  file: File | null;
};

type ExtraPhotoItem = {
  id: string;
  label: string;
  file: File | null;
};

type ExistingClient = {
  client_id: number;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  address: string;
};

type ExistingCar = {
  car_id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: string;
  color: string;
  chassis: string;
  mileage_in: number;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newId() {
  return Math.random().toString(36).slice(2);
}

function formatAnswers(answers: Record<string, string>): string {
  const lines = intakeQuestions
    .map((q) => ({ label: q.label, value: answers[q.key]?.trim() }))
    .filter(({ value }) => value)
    .map(({ label, value }) => `${label}\nR: ${value}`);

  return lines.join("\n\n");
}

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

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ExistingClient[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);

  // passo 2 — veículo
  const [existingCars, setExistingCars] = useState<ExistingCar[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [carMode, setCarMode] = useState<"existing" | "new">("new");
  // KM da visita atual quando reaproveita um veículo — nunca sobrescreve o
  // mileage_in do cadastro do carro (perderia o histórico de KM entre visitas).
  const [currentMileage, setCurrentMileage] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [brandMode, setBrandMode] = useState<"list" | "custom">("list");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("flex");
  const [color, setColor] = useState("");
  const [chassis, setChassis] = useState("");
  const [mileageIn, setMileageIn] = useState("");

  // passo 3 — defeito relatado
  const [complaint, setComplaint] = useState("");
  const [clientMedia, setClientMedia] = useState<ClientMediaItem[]>([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // passo 4 — fotos de entrada
  const [photos, setPhotos] = useState<Record<PhotoKey, File | null>>({
    front: null,
    rear: null,
    left: null,
    right: null,
  });
  const [extraPhotos, setExtraPhotos] = useState<ExtraPhotoItem[]>([]);

  const stepCount = 5;

  const clientValid =
    selectedClientId !== null ||
    (name.trim().length >= 2 &&
      isValidPhone(e164ToDigits(phone)) &&
      isValidCpf(cpf) &&
      emailRegex.test(email) &&
      address.trim().length >= 3);

  const carValid =
    (carMode === "existing" &&
      selectedCarId !== null &&
      currentMileage.length > 0) ||
    (carMode === "new" &&
      isValidPlate(plate) &&
      brand.trim().length >= 2 &&
      model.trim().length >= 1 &&
      isValidYear(year) &&
      color.trim().length >= 2 &&
      chassis.trim().length >= 5 &&
      mileageIn.length > 0);

  // busca de cliente existente (tenant-scoped no backend), debounced
  useEffect(() => {
    if (selectedClientId !== null) return;
    const term = clientSearch.trim();

    if (term.length < 2) {
      setClientResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setSearchingClients(true);
        const results = await apiFetch<ExistingClient[]>(
          `/clients?search=${encodeURIComponent(term)}`,
          { silent: true },
        );
        setClientResults(results);
      } catch {
        setClientResults([]);
      } finally {
        setSearchingClients(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [clientSearch, selectedClientId]);

  // veículos já cadastrados pro cliente selecionado
  useEffect(() => {
    if (selectedClientId === null) {
      setExistingCars([]);
      setCarMode("new");
      setSelectedCarId(null);
      return;
    }

    (async () => {
      try {
        setLoadingCars(true);
        const cars = await apiFetch<ExistingCar[]>(
          `/cars?client_id=${selectedClientId}`,
          { silent: true },
        );
        setExistingCars(cars);
        setCarMode(cars.length > 0 ? "existing" : "new");
      } catch {
        setExistingCars([]);
        setCarMode("new");
      } finally {
        setLoadingCars(false);
      }
    })();
  }, [selectedClientId]);

  const selectClient = (client: ExistingClient) => {
    setSelectedClientId(client.client_id);
    setName(client.name);
    setPhone(client.phone);
    setCpf(client.cpf);
    setEmail(client.email ?? "");
    setAddress(client.address);
    setClientResults([]);
    setClientSearch("");
  };

  const clearClientSelection = () => {
    setSelectedClientId(null);
    setName("");
    setPhone("");
    setCpf("");
    setEmail("");
    setAddress("");
    setSelectedCarId(null);
  };

  const selectCar = (car: ExistingCar) => {
    setSelectedCarId(car.car_id);
    setPlate(car.plate);
    setBrand(car.brand);
    setModel(car.model);
    setYear(String(car.year));
    setFuelType(car.fuel_type);
    setColor(car.color);
    setChassis(car.chassis);
    setMileageIn(String(car.mileage_in));
    // ponto de partida razoável — o mecânico ajusta pro KM real dessa visita
    setCurrentMileage(String(car.mileage_in));
  };

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

  const uploadMedia = async (
    file: File,
    label: string,
    sectionId: number,
    type: MediaCaptureType,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("section_id", String(sectionId));
    formData.append("type", type);
    formData.append("label", label);
    await apiFetch("/medias", { method: "POST", body: formData });
  };

  const addClientMedia = (type: MediaCaptureType) => {
    setClientMedia((prev) => [...prev, { id: newId(), type, file: null }]);
  };

  const updateClientMedia = (id: string, file: File | null) => {
    setClientMedia((prev) => prev.map((m) => (m.id === id ? { ...m, file } : m)));
  };

  const removeClientMedia = (id: string) => {
    setClientMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const addExtraPhoto = () => {
    setExtraPhotos((prev) => [...prev, { id: newId(), label: "", file: null }]);
  };

  const updateExtraPhoto = (id: string, patch: Partial<ExtraPhotoItem>) => {
    setExtraPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeExtraPhoto = (id: string) => {
    setExtraPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const submitAll = async () => {
    try {
      setSubmitting(true);

      const clientId =
        selectedClientId ??
        (
          await apiFetch<{ client_id: number }>("/clients", {
            method: "POST",
            json: {
              name: name.trim(),
              phone,
              email: email.trim(),
              cpf: onlyDigits(cpf),
              address: address.trim(),
            },
          })
        ).client_id;

      const carId =
        carMode === "existing" && selectedCarId !== null
          ? selectedCarId
          : (
              await apiFetch<{ car_id: number }>("/cars", {
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
                  client_id: clientId,
                },
              })
            ).car_id;

      const orderMileageIn =
        carMode === "existing" && selectedCarId !== null
          ? Number(currentMileage)
          : Number(mileageIn);

      const serviceOrder = await apiFetch<{ service_order_id: number }>("/service_orders", {
        method: "POST",
        json: {
          car_id: carId,
          client_complaint: complaint.trim(),
          mileage_in: orderMileageIn,
        },
      });

      // relato do cliente (mídia + roteiro) — só cria a etapa se houver algo de fato
      const filledClientMedia = clientMedia.filter((m): m is ClientMediaItem & { file: File } =>
        Boolean(m.file),
      );
      const answersText = formatAnswers(answers);
      const hasIntakeContent = filledClientMedia.length > 0 || answersText.length > 0;

      if (hasIntakeContent) {
        const intakeSection = await apiFetch<{ section_id: number }>("/sections", {
          method: "POST",
          json: {
            service_order_id: serviceOrder.service_order_id,
            type: "intake",
            notes: answersText || null,
          },
        });

        await Promise.all(
          filledClientMedia.map((m) =>
            uploadMedia(m.file, clientMediaLabels[m.type], intakeSection.section_id, m.type),
          ),
        );

        await apiFetch(`/sections/${intakeSection.section_id}/publish`, { method: "PATCH" });
      }

      const section = await apiFetch<{ section_id: number }>("/sections", {
        method: "POST",
        json: {
          service_order_id: serviceOrder.service_order_id,
          type: "checkin",
          notes: "Registro fotográfico da entrada do veículo.",
        },
      });

      const filledExtraPhotos = extraPhotos.filter(
        (p): p is ExtraPhotoItem & { file: File } => p.file !== null,
      );

      await Promise.all([
        ...(Object.keys(photoLabels) as PhotoKey[]).map((key) =>
          uploadMedia(photos[key] as File, photoLabels[key], section.section_id, "photo"),
        ),
        ...filledExtraPhotos.map((p) =>
          uploadMedia(p.file, p.label.trim() || "Detalhe adicional", section.section_id, "photo"),
        ),
      ]);

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
          {selectedClientId !== null ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/[0.06] p-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
                  <Check className="h-3.5 w-3.5" />
                  Cliente já cadastrado
                </p>
                <p className="mt-1.5 font-medium text-foreground">{name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPhone(e164ToDigits(phone))}
                  {cpf && ` · CPF ${cpf}`}
                </p>
                {address && <p className="text-sm text-muted-foreground">{address}</p>}
              </div>
              <Button type="button" variant="outline" className="h-9 shrink-0" onClick={clearClientSelection}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <FieldShell label="Buscar cliente existente" htmlFor="client-search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="client-search"
                    type="text"
                    placeholder="Nome, CPF ou telefone..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                  {searchingClients && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </FieldShell>

              {clientResults.length > 0 && (
                <div className="space-y-1.5 rounded-2xl border border-border bg-card p-2">
                  {clientResults.map((client) => (
                    <button
                      key={client.client_id}
                      type="button"
                      onClick={() => selectClient(client)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/40"
                    >
                      <span>
                        <span className="block text-sm font-medium">{client.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatPhone(e164ToDigits(client.phone))} · CPF {client.cpf}
                        </span>
                      </span>
                      <Plus className="h-4 w-4 text-brand" />
                    </button>
                  ))}
                </div>
              )}

              {clientSearch.trim().length >= 2 &&
                !searchingClients &&
                clientResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum cliente encontrado — preencha os dados abaixo pra cadastrar um novo.
                  </p>
                )}
            </div>
          )}

          <div className={selectedClientId !== null ? "hidden" : "space-y-4"}>
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
        <div className="space-y-4">
          {loadingCars && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando veículos do cliente...
            </div>
          )}

          {!loadingCars && existingCars.length > 0 && carMode === "existing" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Veículos já cadastrados desse cliente</p>
              <div className="space-y-1.5">
                {existingCars.map((car) => (
                  <button
                    key={car.car_id}
                    type="button"
                    onClick={() => selectCar(car)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${
                      selectedCarId === car.car_id
                        ? "border-brand/40 bg-brand/[0.06]"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="block text-sm font-medium">
                          {car.brand} {car.model} · {car.year}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {car.plate} · {car.color}
                        </span>
                      </span>
                    </span>
                    {selectedCarId === car.car_id && <Check className="h-4 w-4 text-brand" />}
                  </button>
                ))}
              </div>

              {selectedCarId !== null && (
                <KmField
                  value={currentMileage}
                  onChange={setCurrentMileage}
                  label="KM atual (nessa visita)"
                />
              )}

              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => {
                  setCarMode("new");
                  setSelectedCarId(null);
                  setCurrentMileage("");
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Cadastrar veículo novo
              </Button>
            </div>
          )}

          {carMode === "new" && existingCars.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setCarMode("existing")}
            >
              <X className="mr-1.5 h-4 w-4" />
              Usar veículo já cadastrado
            </Button>
          )}

          <div
            className={
              carMode === "existing"
                ? "hidden"
                : "grid grid-cols-1 gap-4 sm:grid-cols-2"
            }
          >
          <PlateField value={plate} onChange={setPlate} />
          <YearField value={year} onChange={setYear} />

          <FieldShell label="Marca" htmlFor="brand">
            {brandMode === "list" ? (
              <select
                id="brand"
                value={CAR_BRANDS.includes(brand as (typeof CAR_BRANDS)[number]) ? brand : ""}
                onChange={(e) => {
                  if (e.target.value === OTHER_BRAND) {
                    setBrandMode("custom");
                    setBrand("");
                    return;
                  }
                  setBrand(e.target.value);
                }}
                className={inputClass}
              >
                <option value="" disabled>
                  Selecione a marca
                </option>
                {CAR_BRANDS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={OTHER_BRAND}>Outra (digitar)</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  id="brand"
                  type="text"
                  placeholder="Digite a marca"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() => {
                    setBrandMode("list");
                    setBrand("");
                  }}
                >
                  Lista
                </Button>
              </div>
            )}
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
        <div className="space-y-6">
          <div>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Ex: veículo falha ao ligar de manhã, painel oscila e a bateria descarrega com frequência..."
              maxLength={500}
              className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {complaint.length}/500
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
            <div>
              <p className="text-sm font-medium">
                Tem foto, vídeo ou áudio do problema? <span className="text-muted-foreground">(opcional)</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Ajuda o mecânico a entender exatamente o que você quis dizer.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-10" onClick={() => addClientMedia("photo")}>
                <Plus className="mr-1.5 h-4 w-4" />
                Foto
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={() => addClientMedia("video")}>
                <Video className="mr-1.5 h-4 w-4" />
                Vídeo
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={() => addClientMedia("audio")}>
                <Mic className="mr-1.5 h-4 w-4" />
                Áudio
              </Button>
            </div>

            {clientMedia.map((item) => (
              <div key={item.id} className="space-y-2 rounded-xl bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {clientMediaLabels[item.type]}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeClientMedia(item.id)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <MediaCaptureField
                  type={item.type}
                  value={item.file}
                  onChange={(file) => updateClientMedia(item.id, file)}
                />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-border p-4">
            <button
              type="button"
              onClick={() => setShowQuestionnaire((s) => !s)}
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="text-sm font-medium">Roteiro de perguntas extra</span>{" "}
                <span className="text-xs text-muted-foreground">
                  (opcional — pule se o cliente tiver pressa)
                </span>
              </span>
              {showQuestionnaire ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showQuestionnaire && (
              <div className="mt-4 space-y-4">
                {intakeQuestions.map((q) => (
                  <FieldShell key={q.key} label={q.label} htmlFor={q.key} optional>
                    {q.type === "select" ? (
                      <select
                        id={q.key}
                        value={answers[q.key] ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                        }
                        className={inputClass}
                      >
                        <option value="">Não perguntado</option>
                        {q.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={q.key}
                        type="text"
                        value={answers[q.key] ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                        }
                        className={inputClass}
                      />
                    )}
                  </FieldShell>
                ))}
              </div>
            )}
          </div>
        </div>
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
        <div className="space-y-4">
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

          <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
            <p className="text-sm font-medium">
              Riscos, avarias ou detalhes extras? <span className="text-muted-foreground">(opcional)</span>
            </p>

            {extraPhotos.map((photo) => (
              <div key={photo.id} className="space-y-2 rounded-xl bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ex: risco na porta traseira"
                    value={photo.label}
                    onChange={(e) => updateExtraPhoto(photo.id, { label: e.target.value })}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeExtraPhoto(photo.id)}
                    className="shrink-0 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <MediaCaptureField
                  type="photo"
                  value={photo.file}
                  onChange={(file) => updateExtraPhoto(photo.id, { file })}
                />
              </div>
            ))}

            <Button type="button" variant="outline" className="h-10" onClick={addExtraPhoto}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar mais fotos
            </Button>
          </div>
        </div>
      </WizardShell>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;
  const filledClientMediaCount = clientMedia.filter((m) => m.file).length;
  const filledExtraPhotosCount = extraPhotos.filter((p) => p.file).length;

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
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Cliente
            {selectedClientId !== null && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand">já cadastrado</span>
            )}
          </p>
          <p className="mt-1 text-sm text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            {formatPhone(e164ToDigits(phone))} · {email}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Veículo
            {carMode === "existing" && selectedCarId !== null && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand">já cadastrado</span>
            )}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {brand} {model} · {year} · {color}
          </p>
          <p className="text-sm text-muted-foreground">
            {plate.toUpperCase()} ·{" "}
            {(() => {
              const km =
                carMode === "existing" && selectedCarId !== null
                  ? currentMileage
                  : mileageIn;
              return km ? Number(km).toLocaleString("pt-BR") : 0;
            })()}{" "}
            km {carMode === "existing" && selectedCarId !== null && "nessa visita"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Defeito relatado
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{complaint}</p>
          {(filledClientMediaCount > 0 || answeredCount > 0) && (
            <p className="mt-2 text-xs text-brand">
              {filledClientMediaCount > 0 &&
                `${filledClientMediaCount} mídia(s) do cliente`}
              {filledClientMediaCount > 0 && answeredCount > 0 && " · "}
              {answeredCount > 0 && `${answeredCount} pergunta(s) respondida(s)`}
            </p>
          )}
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
          {filledExtraPhotosCount > 0 && (
            <p className="mt-2 text-xs text-brand">
              + {filledExtraPhotosCount} foto(s) extra(s)
            </p>
          )}
        </div>
      </div>
    </WizardShell>
  );
}
