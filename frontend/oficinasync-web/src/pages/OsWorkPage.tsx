import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type MediaItem = {
  media_id: number;
  type: string;
  bucket: string;
  object_name: string;
  mime_type: string;
  size: number;
  label: string | null;
  created_at: string;
  url?: string;
};

type SectionItem = {
  section_id: number;
  type: string;
  status: string;
  notes: string | null;
  published_at: string | null;
  created_at: string;
  medias: MediaItem[];
};

type ServiceOrderData = {
  service_order_id: number;
  status: string;
  client_complaint: string;
  created_at: string;
  public_token: string;
  public_url: string;
  tenant: {
    name: string;
  };
  user: {
    user_id: number;
    name: string;
    email: string;
  };
  car: {
    car_id: number;
    brand: string;
    model: string;
    year: number;
    plate: string;
    mileage_in: number;
    color: string;
    fuel_type: string;
  };
  client: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
  };
  sections: SectionItem[];
};

const sectionLabels: Record<string, string> = {
  checkin: "Check-in",
  obd_scan: "Scanner / OBD",
  diagnosis: "Diagnóstico",
  repair: "Reparo",
  preventive: "Inspeção Geral",
  final: "Finalização",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  open: "Em aberto",
  in_progress: "Em andamento",
  done: "Concluída",
  cancelled: "Cancelada",
};

const sectionTypeOptions = [
  { value: "checkin", label: "Check-in" },
  { value: "obd_scan", label: "Scanner / OBD" },
  { value: "diagnosis", label: "Diagnóstico" },
  { value: "repair", label: "Reparo" },
  { value: "preventive", label: "Inspeção Geral" },
  { value: "final", label: "Finalização" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatStatus(status: string) {
  return statusLabels[status] ?? status;
}

function getSectionTitle(type: string) {
  return sectionLabels[type] ?? type;
}

function getPillClass(status: string) {
  const map: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700",
    published: "bg-emerald-100 text-emerald-700",
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return map[status] ?? "bg-muted text-foreground";
}

function MediaPreview({ media }: { media: MediaItem }) {
  if (!media.url) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        URL da mídia não disponível.
      </div>
    );
  }

  if (media.mime_type.startsWith("image/")) {
    return (
      <img
        src={media.url}
        alt={media.label ?? "Imagem"}
        className="h-56 w-full rounded-xl object-cover"
      />
    );
  }

  if (media.mime_type.startsWith("video/")) {
    return (
      <video controls className="w-full rounded-xl">
        <source src={media.url} type={media.mime_type} />
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  if (media.mime_type.startsWith("audio/")) {
    return (
      <audio controls className="w-full">
        <source src={media.url} type={media.mime_type} />
        Seu navegador não suporta áudio.
      </audio>
    );
  }

  return (
    <div className="rounded-xl border p-4 text-sm">
      Arquivo anexado: {media.label ?? media.object_name}
    </div>
  );
}

export function OsWorkPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<ServiceOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddSectionBox, setShowAddSectionBox] = useState(false);
  const [selectedSectionType, setSelectedSectionType] = useState("");
  const [newSectionNotes, setNewSectionNotes] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [openMediaSectionId, setOpenMediaSectionId] = useState<number | null>(null);
  const [uploadingSectionId, setUploadingSectionId] = useState<number | null>(null);
  const [mediaTypeBySection, setMediaTypeBySection] = useState<Record<number, string>>({});
  const [mediaLabelBySection, setMediaLabelBySection] = useState<Record<number, string>>({});
  const [mediaFileBySection, setMediaFileBySection] = useState<Record<number, File | null>>({});

  const [publishingSectionId, setPublishingSectionId] = useState<number | null>(null);

  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingNotesBySection, setEditingNotesBySection] = useState<Record<number, string>>({});
  const [savingEditSectionId, setSavingEditSectionId] = useState<number | null>(null);

  const fetchServiceOrder = async () => {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      setError("Dados de acesso não encontrados.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`http://localhost:3000/service_orders/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message ?? "Não foi possível carregar a ordem de serviço.");
        return;
      }

      setData(result);
    } catch {
      setError("Erro ao carregar ordem de serviço.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceOrder();
  }, [id]);

  const orderedSections = useMemo(() => {
    if (!data?.sections) return [];

    const visualOrder: Record<string, number> = {
      checkin: 1,
      obd_scan: 2,
      diagnosis: 3,
      repair: 4,
      preventive: 5,
      final: 6,
    };

    return [...data.sections].sort((a, b) => {
      return (visualOrder[a.type] ?? 999) - (visualOrder[b.type] ?? 999);
    });
  }, [data]);

  const availableSectionTypes = useMemo(() => {
    if (!data?.sections) return sectionTypeOptions;

    const existingTypes = data.sections.map((section) => section.type);

    return sectionTypeOptions.filter(
      (option) => !existingTypes.includes(option.value)
    );
  }, [data]);

  useEffect(() => {
    if (availableSectionTypes.length > 0) {
      setSelectedSectionType(availableSectionTypes[0].value);
    } else {
      setSelectedSectionType("");
    }
  }, [availableSectionTypes]);

  const handleCreateSection = async () => {
    const token = localStorage.getItem("token");

    if (!token || !data || !selectedSectionType) {
      return;
    }

    try {
      setCreatingSection(true);

      const response = await fetch("http://localhost:3000/sections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_order_id: data.service_order_id,
          type: selectedSectionType,
          notes: newSectionNotes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao criar etapa.");
        return;
      }

      setShowAddSectionBox(false);
      setNewSectionNotes("");
      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar etapa.");
    } finally {
      setCreatingSection(false);
    }
  };

  const handleOpenMediaForm = (sectionId: number) => {
    setOpenMediaSectionId((current) => (current === sectionId ? null : sectionId));

    setMediaTypeBySection((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] ?? "photo",
    }));

    setMediaLabelBySection((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] ?? "",
    }));

    setMediaFileBySection((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] ?? null,
    }));
  };

  const handleMediaFileChange = (sectionId: number, file: File | null) => {
    setMediaFileBySection((prev) => ({
      ...prev,
      [sectionId]: file,
    }));
  };

  const handleUploadMedia = async (sectionId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Token não encontrado.");
      return;
    }

    const selectedType = mediaTypeBySection[sectionId] ?? "photo";
    const selectedLabel = mediaLabelBySection[sectionId] ?? "";
    const selectedFile = mediaFileBySection[sectionId];

    if (!selectedFile) {
      alert("Selecione um arquivo.");
      return;
    }

    try {
      setUploadingSectionId(sectionId);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("section_id", String(sectionId));
      formData.append("type", selectedType);
      formData.append("label", selectedLabel);

      const response = await fetch("http://localhost:3000/medias", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao enviar mídia.");
        return;
      }

      setMediaLabelBySection((prev) => ({
        ...prev,
        [sectionId]: "",
      }));

      setMediaFileBySection((prev) => ({
        ...prev,
        [sectionId]: null,
      }));

      setOpenMediaSectionId(null);

      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar mídia.");
    } finally {
      setUploadingSectionId(null);
    }
  };

  const handlePublishSection = async (sectionId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Token não encontrado.");
      return;
    }

    try {
      setPublishingSectionId(sectionId);

      const response = await fetch(
        `http://localhost:3000/sections/${sectionId}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao publicar etapa.");
        return;
      }

      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao publicar etapa.");
    } finally {
      setPublishingSectionId(null);
    }
  };

  const handleOpenEditForm = (sectionId: number, currentNotes: string | null) => {
    setEditingSectionId((current) => (current === sectionId ? null : sectionId));

    setEditingNotesBySection((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] ?? (currentNotes ?? ""),
    }));
  };

  const handleSaveSectionText = async (sectionId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Token não encontrado.");
      return;
    }

    try {
      setSavingEditSectionId(sectionId);

      const response = await fetch(`http://localhost:3000/sections/${sectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: editingNotesBySection[sectionId] ?? "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao editar etapa.");
        return;
      }

      setEditingSectionId(null);
      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao editar etapa.");
    } finally {
      setSavingEditSectionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 p-6">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <p className="text-sm text-muted-foreground">Carregando ordem de serviço...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-100 p-6">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl border-red-200">
            <CardContent className="p-8">
              <h1 className="text-xl font-semibold">Não foi possível abrir esta OS</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || "Ordem de serviço não encontrada."}
              </p>

              <Button className="mt-6" variant="outline" onClick={() => navigate("/dashboard")}>
                Voltar para dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-black via-neutral-950 to-emerald-950 text-white shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="text-sm text-emerald-400">{data.tenant.name}</div>

                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">
                    OS #{data.service_order_id}
                  </h1>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPillClass(
                      data.status
                    )}`}
                  >
                    {formatStatus(data.status)}
                  </span>
                </div>

                <p className="max-w-2xl text-sm text-white/70">
                  Tela operacional da ordem de serviço. Aqui o mecânico acompanha,
                  registra e publica cada etapa do reparo.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => window.open(data.public_url, "_blank")}
                >
                  Ver página do cliente
                </Button>

                <Button
                  className="bg-lime-400 text-black hover:bg-lime-500"
                  onClick={() => navigator.clipboard.writeText(data.public_url)}
                >
                  Copiar link do cliente
                </Button>

                <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                  Voltar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Defeito relatado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {data.client_complaint || "Sem relato informado."}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Nome:</strong> {data.client.name}</p>
              <p><strong>Telefone:</strong> {data.client.phone}</p>
              <p><strong>Email:</strong> {data.client.email || "-"}</p>
              <p><strong>CPF:</strong> {data.client.cpf || "-"}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Dados do veículo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="font-medium">Modelo</p>
              <p className="mt-1 text-muted-foreground">
                {data.car.brand} {data.car.model}
              </p>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="font-medium">Placa</p>
              <p className="mt-1 text-muted-foreground">{data.car.plate}</p>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="font-medium">Ano</p>
              <p className="mt-1 text-muted-foreground">{data.car.year}</p>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="font-medium">KM de entrada</p>
              <p className="mt-1 text-muted-foreground">
                {data.car.mileage_in.toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="font-medium">Cor</p>
              <p className="mt-1 text-muted-foreground">{data.car.color}</p>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="font-medium">Combustível</p>
              <p className="mt-1 text-muted-foreground">{data.car.fuel_type}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Etapas da ordem de serviço</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Registre o storytelling do reparo e publique quando quiser mostrar ao cliente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddSectionBox((prev) => !prev)}
                disabled={availableSectionTypes.length === 0}
              >
                {availableSectionTypes.length === 0
                  ? "Todas as etapas já foram criadas"
                  : "Adicionar etapa"}
              </Button>

              <Button variant="outline">Finalizar OS</Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {showAddSectionBox && availableSectionTypes.length > 0 && (
              <div className="rounded-2xl border bg-background p-4 space-y-4">
                <div>
                  <h3 className="font-medium">Nova etapa</h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha uma etapa que ainda não existe nesta OS.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo da etapa</label>
                    <select
                      value={selectedSectionType}
                      onChange={(e) => setSelectedSectionType(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {availableSectionTypes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações iniciais</label>
                    <input
                      type="text"
                      value={newSectionNotes}
                      onChange={(e) => setNewSectionNotes(e.target.value)}
                      placeholder="Ex: leitura do scanner realizada"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="bg-lime-400 text-black hover:bg-lime-500"
                    onClick={handleCreateSection}
                    disabled={creatingSection || !selectedSectionType}
                  >
                    {creatingSection ? "Criando..." : "Criar etapa"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowAddSectionBox(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {orderedSections.length === 0 && (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Nenhuma etapa cadastrada ainda.
              </div>
            )}

            {orderedSections.map((section) => (
              <Card key={section.section_id} className="rounded-2xl border shadow-none">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {getSectionTitle(section.type)}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Criada em {formatDate(section.created_at)} • Publicada em{" "}
                      {formatDate(section.published_at)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${getPillClass(
                      section.status
                    )}`}
                  >
                    {formatStatus(section.status)}
                  </span>
                </CardHeader>

                <CardContent className="space-y-5">
                  {editingSectionId === section.section_id ? (
                    <div className="rounded-2xl border bg-background p-4 space-y-4">
                      <div>
                        <h3 className="font-medium">Editar texto da etapa</h3>
                        <p className="text-sm text-muted-foreground">
                          Ajuste a explicação desta etapa antes de publicar.
                        </p>
                      </div>

                      <textarea
                        value={editingNotesBySection[section.section_id] ?? ""}
                        onChange={(e) =>
                          setEditingNotesBySection((prev) => ({
                            ...prev,
                            [section.section_id]: e.target.value,
                          }))
                        }
                        placeholder="Descreva o que foi analisado ou realizado nesta etapa..."
                        className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                      />

                      <div className="flex gap-2">
                        <Button
                          className="bg-lime-400 text-black hover:bg-lime-500"
                          onClick={() => handleSaveSectionText(section.section_id)}
                          disabled={savingEditSectionId === section.section_id}
                        >
                          {savingEditSectionId === section.section_id
                            ? "Salvando..."
                            : "Salvar texto"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setEditingSectionId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-muted/40 p-4">
                      <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {section.notes || "Sem observações nesta etapa."}
                      </p>
                    </div>
                  )}

                  {openMediaSectionId === section.section_id && (
                    <div className="rounded-2xl border bg-background p-4 space-y-4">
                      <div>
                        <h3 className="font-medium">Adicionar mídia nesta etapa</h3>
                        <p className="text-sm text-muted-foreground">
                          Envie foto, vídeo ou áudio para complementar esta parte do serviço.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tipo</label>
                          <select
                            value={mediaTypeBySection[section.section_id] ?? "photo"}
                            onChange={(e) =>
                              setMediaTypeBySection((prev) => ({
                                ...prev,
                                [section.section_id]: e.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="photo">Foto</option>
                            <option value="video">Vídeo</option>
                            <option value="audio">Áudio</option>
                          </select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Legenda</label>
                          <input
                            type="text"
                            value={mediaLabelBySection[section.section_id] ?? ""}
                            onChange={(e) =>
                              setMediaLabelBySection((prev) => ({
                                ...prev,
                                [section.section_id]: e.target.value,
                              }))
                            }
                            placeholder="Ex: detalhe da falha no chicote"
                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Arquivo</label>
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*"
                          onChange={(e) =>
                            handleMediaFileChange(
                              section.section_id,
                              e.target.files?.[0] ?? null
                            )
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-lime-100 file:px-3 file:py-1.5"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="bg-lime-400 text-black hover:bg-lime-500"
                          onClick={() => handleUploadMedia(section.section_id)}
                          disabled={uploadingSectionId === section.section_id}
                        >
                          {uploadingSectionId === section.section_id
                            ? "Enviando..."
                            : "Salvar mídia"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setOpenMediaSectionId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {section.medias.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Mídias da etapa
                        </h3>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          {section.medias.map((media) => (
                            <div
                              key={media.media_id}
                              className="space-y-3 rounded-2xl border p-4"
                            >
                              <MediaPreview media={media} />

                              <div>
                                <p className="text-sm font-medium">
                                  {media.label || "Mídia anexada"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {media.type} • {media.mime_type}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenMediaForm(section.section_id)}
                    >
                      {openMediaSectionId === section.section_id
                        ? "Fechar mídia"
                        : "Adicionar mídia"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        handleOpenEditForm(section.section_id, section.notes)
                      }
                    >
                      {editingSectionId === section.section_id
                        ? "Fechar edição"
                        : "Editar texto"}
                    </Button>

                    <Button
                      className="bg-lime-400 text-black hover:bg-lime-500"
                      onClick={() => handlePublishSection(section.section_id)}
                      disabled={
                        publishingSectionId === section.section_id ||
                        section.status === "published"
                      }
                    >
                      {publishingSectionId === section.section_id
                        ? "Publicando..."
                        : section.status === "published"
                        ? "Etapa publicada"
                        : "Publicar etapa"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}