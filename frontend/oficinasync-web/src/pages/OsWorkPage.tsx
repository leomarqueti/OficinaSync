import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TestTypeSelector } from "@/components/tests/TestTypeSelector";
import { BateriaForm } from "@/components/tests/BateriaForm";
import { BateriaCard } from "@/components/tests/BateriaCard";
import { LeituraDtcForm } from "@/components/tests/LeituraDtcForm";
import { LeituraDtcCard } from "@/components/tests/LeituraDtcCard";
import { CompressaoMecanicaForm } from "@/components/tests/CompressaoMecanicaForm";
import { CompressaoMecanicaCard } from "@/components/tests/CompressaoMecanicaCard";
import { InjetoresBancoForm } from "@/components/tests/InjetoresBancoForm";
import { InjetoresBancoCard } from "@/components/tests/InjetoresBancoCard";
import type {
  BateriaData,
  CompressaoMecanicaData,
  InjetoresBancoData,
  LeituraDtcData,
  TestTypeCategory,
} from "@/components/tests/testTypes";
import { API_URL } from "@/lib/api";

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

type TestMeasurement = {
  label: string;
  expected?: string;
  actual: string;
};

type Verdict = "approved" | "failed" | "inconclusive";

type TestItem = {
  test_id: number;
  title: string;
  measurements: TestMeasurement[] | null;
  test_type: TestTypeCategory | null;
  data: Record<string, unknown> | null;
  verdict: Verdict | null;
  notes: string | null;
  created_at: string;
};

type TestDraft = {
  title: string;
  measurements: TestMeasurement[];
  verdict: Verdict | "";
  notes: string;
};

type SectionItem = {
  section_id: number;
  type: string;
  status: string;
  notes: string | null;
  published_at: string | null;
  created_at: string;
  medias: MediaItem[];
  tests: TestItem[];
};

type ServiceOrderData = {
  service_order_id: number;
  status: string;
  client_complaint: string;
  created_at: string;
  promo_video_status?: "none" | "processing" | "ready" | "failed";
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

const verdictLabels: Record<string, string> = {
  approved: "Aprovado",
  failed: "Reprovado",
  inconclusive: "Inconclusivo",
};

const testTitleSuggestions = [
  "Teste de bateria",
  "Teste de compressão",
  "Teste de vazão dos bicos injetores",
  "Leitura de scanner",
  "Teste de bomba de combustível",
];

function getVerdictPillClass(verdict: string | null) {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    inconclusive: "bg-amber-100 text-amber-700",
  };

  return verdict ? map[verdict] ?? "bg-muted text-foreground" : "bg-muted text-foreground";
}

function emptyTestDraft(): TestDraft {
  return {
    title: "",
    measurements: [{ label: "", expected: "", actual: "" }],
    verdict: "",
    notes: "",
  };
}

function cleanMeasurements(measurements: TestMeasurement[]) {
  return measurements
    .filter((m) => m.label.trim() !== "" || m.actual.trim() !== "")
    .map((m) => ({
      label: m.label.trim(),
      actual: m.actual.trim(),
      ...(m.expected?.trim() ? { expected: m.expected.trim() } : {}),
    }));
}

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

  const [openTestSectionId, setOpenTestSectionId] = useState<number | null>(null);
  const [testDraftBySection, setTestDraftBySection] = useState<Record<number, TestDraft>>({});
  const [savingTestSectionId, setSavingTestSectionId] = useState<number | null>(null);
  const [newTestTypeBySection, setNewTestTypeBySection] = useState<
    Record<number, TestTypeCategory | "generic" | null>
  >({});

  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [editingTestDraft, setEditingTestDraft] = useState<TestDraft | null>(null);
  const [savingEditTestId, setSavingEditTestId] = useState<number | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);

  const [downloadingReport, setDownloadingReport] = useState(false);
  const [triggeringPromoVideo, setTriggeringPromoVideo] = useState(false);

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

      const response = await fetch(`${API_URL}/service_orders/${id}`, {
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

  useEffect(() => {
    if (data?.promo_video_status !== "processing") return;

    const interval = setInterval(() => {
      fetchServiceOrder();
    }, 4000);

    return () => clearInterval(interval);
  }, [data?.promo_video_status]);

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

      const response = await fetch(`${API_URL}/sections`, {
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

      const response = await fetch(`${API_URL}/medias`, {
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
        `${API_URL}/sections/${sectionId}/publish`,
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

      const response = await fetch(`${API_URL}/sections/${sectionId}`, {
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

  const handleDownloadReport = async () => {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      alert("Token não encontrado.");
      return;
    }

    try {
      setDownloadingReport(true);

      const response = await fetch(
        `${API_URL}/service_orders/${id}/report.pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.message ?? "Erro ao gerar o laudo em PDF.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laudo-os-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar o laudo em PDF.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleGeneratePromoVideo = async () => {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      alert("Token não encontrado.");
      return;
    }

    try {
      setTriggeringPromoVideo(true);

      const response = await fetch(
        `${API_URL}/service_orders/${id}/promo-video`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao gerar vídeo de divulgação.");
        return;
      }

      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar vídeo de divulgação.");
    } finally {
      setTriggeringPromoVideo(false);
    }
  };

  const promoVideoMedia = data?.sections
    .flatMap((section) => section.medias)
    .find((media) => media.label === "Vídeo de divulgação");

  const handleOpenTestForm = (sectionId: number) => {
    setOpenTestSectionId((current) => (current === sectionId ? null : sectionId));

    setTestDraftBySection((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] ?? emptyTestDraft(),
    }));

    setNewTestTypeBySection((prev) => ({ ...prev, [sectionId]: null }));
  };

  const updateNewTestField = (
    sectionId: number,
    field: "title" | "verdict" | "notes",
    value: string,
  ) => {
    setTestDraftBySection((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? emptyTestDraft()), [field]: value },
    }));
  };

  const updateNewTestMeasurement = (
    sectionId: number,
    index: number,
    field: keyof TestMeasurement,
    value: string,
  ) => {
    setTestDraftBySection((prev) => {
      const draft = prev[sectionId] ?? emptyTestDraft();
      const measurements = draft.measurements.map((m, i) =>
        i === index ? { ...m, [field]: value } : m,
      );
      return { ...prev, [sectionId]: { ...draft, measurements } };
    });
  };

  const addNewTestMeasurementRow = (sectionId: number) => {
    setTestDraftBySection((prev) => {
      const draft = prev[sectionId] ?? emptyTestDraft();
      return {
        ...prev,
        [sectionId]: {
          ...draft,
          measurements: [...draft.measurements, { label: "", expected: "", actual: "" }],
        },
      };
    });
  };

  const removeNewTestMeasurementRow = (sectionId: number, index: number) => {
    setTestDraftBySection((prev) => {
      const draft = prev[sectionId] ?? emptyTestDraft();
      const measurements = draft.measurements.filter((_, i) => i !== index);
      return {
        ...prev,
        [sectionId]: {
          ...draft,
          measurements: measurements.length ? measurements : [{ label: "", expected: "", actual: "" }],
        },
      };
    });
  };

  const handleCreateTest = async (sectionId: number) => {
    const token = localStorage.getItem("token");
    const draft = testDraftBySection[sectionId];

    if (!token || !draft || !draft.title.trim()) {
      alert("Informe o título do teste.");
      return;
    }

    try {
      setSavingTestSectionId(sectionId);

      const response = await fetch(`${API_URL}/tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section_id: sectionId,
          title: draft.title.trim(),
          measurements: cleanMeasurements(draft.measurements),
          verdict: draft.verdict || undefined,
          notes: draft.notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao criar teste.");
        return;
      }

      setTestDraftBySection((prev) => ({ ...prev, [sectionId]: emptyTestDraft() }));
      setOpenTestSectionId(null);
      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar teste.");
    } finally {
      setSavingTestSectionId(null);
    }
  };

  const handleSaveSpecializedTest = async (
    sectionId: number,
    testType: TestTypeCategory,
    payload: { title: string; data: Record<string, unknown>; verdict: string; notes: string },
  ) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Token não encontrado.");
      return;
    }

    if (!payload.title.trim()) {
      alert("Informe o título do teste.");
      return;
    }

    try {
      setSavingTestSectionId(sectionId);

      const response = await fetch(`${API_URL}/tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section_id: sectionId,
          title: payload.title.trim(),
          test_type: testType,
          data: payload.data,
          verdict: payload.verdict || undefined,
          notes: payload.notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao criar teste.");
        return;
      }

      setOpenTestSectionId(null);
      setNewTestTypeBySection((prev) => ({ ...prev, [sectionId]: null }));
      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar teste.");
    } finally {
      setSavingTestSectionId(null);
    }
  };

  const handleOpenEditTest = (test: TestItem) => {
    if (editingTestId === test.test_id) {
      setEditingTestId(null);
      setEditingTestDraft(null);
      return;
    }

    setEditingTestId(test.test_id);
    setEditingTestDraft({
      title: test.title,
      measurements:
        test.measurements && test.measurements.length > 0
          ? test.measurements.map((m) => ({
              label: m.label,
              expected: m.expected ?? "",
              actual: m.actual,
            }))
          : [{ label: "", expected: "", actual: "" }],
      verdict: test.verdict ?? "",
      notes: test.notes ?? "",
    });
  };

  const updateEditTestField = (field: "title" | "verdict" | "notes", value: string) => {
    setEditingTestDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateEditTestMeasurement = (
    index: number,
    field: keyof TestMeasurement,
    value: string,
  ) => {
    setEditingTestDraft((prev) => {
      if (!prev) return prev;
      const measurements = prev.measurements.map((m, i) =>
        i === index ? { ...m, [field]: value } : m,
      );
      return { ...prev, measurements };
    });
  };

  const addEditTestMeasurementRow = () => {
    setEditingTestDraft((prev) =>
      prev
        ? { ...prev, measurements: [...prev.measurements, { label: "", expected: "", actual: "" }] }
        : prev,
    );
  };

  const removeEditTestMeasurementRow = (index: number) => {
    setEditingTestDraft((prev) => {
      if (!prev) return prev;
      const measurements = prev.measurements.filter((_, i) => i !== index);
      return {
        ...prev,
        measurements: measurements.length ? measurements : [{ label: "", expected: "", actual: "" }],
      };
    });
  };

  const handleUpdateTest = async (testId: number) => {
    const token = localStorage.getItem("token");

    if (!token || !editingTestDraft || !editingTestDraft.title.trim()) {
      alert("Informe o título do teste.");
      return;
    }

    try {
      setSavingEditTestId(testId);

      const response = await fetch(`${API_URL}/tests/${testId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editingTestDraft.title.trim(),
          measurements: cleanMeasurements(editingTestDraft.measurements),
          verdict: editingTestDraft.verdict || undefined,
          notes: editingTestDraft.notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao editar teste.");
        return;
      }

      setEditingTestId(null);
      setEditingTestDraft(null);
      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao editar teste.");
    } finally {
      setSavingEditTestId(null);
    }
  };

  const handleDeleteTest = async (testId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Token não encontrado.");
      return;
    }

    if (!window.confirm("Excluir este teste?")) {
      return;
    }

    try {
      setDeletingTestId(testId);

      const response = await fetch(`${API_URL}/tests/${testId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.message ?? "Erro ao excluir teste.");
        return;
      }

      await fetchServiceOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir teste.");
    } finally {
      setDeletingTestId(null);
    }
  };

  const renderMeasurementRows = (
    measurements: TestMeasurement[],
    onChange: (index: number, field: keyof TestMeasurement, value: string) => void,
    onAdd: () => void,
    onRemove: (index: number) => void,
  ) => (
    <div className="space-y-2">
      {measurements.map((measurement, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            type="text"
            value={measurement.label}
            onChange={(e) => onChange(index, "label", e.target.value)}
            placeholder="Ex: Tensão mínima"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={measurement.expected ?? ""}
            onChange={(e) => onChange(index, "expected", e.target.value)}
            placeholder="Esperado (opcional)"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={measurement.actual}
            onChange={(e) => onChange(index, "actual", e.target.value)}
            placeholder="Obtido"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="button" variant="outline" onClick={() => onRemove(index)}>
            Remover
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={onAdd}>
        + Adicionar linha
      </Button>
    </div>
  );

  const renderTestFormBody = (
    draft: TestDraft,
    handlers: {
      onTitleChange: (value: string) => void;
      onVerdictChange: (value: string) => void;
      onNotesChange: (value: string) => void;
      onMeasurementChange: (index: number, field: keyof TestMeasurement, value: string) => void;
      onAddRow: () => void;
      onRemoveRow: (index: number) => void;
    },
    onSave: () => void,
    onCancel: () => void,
    saving: boolean,
  ) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Título do teste</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => handlers.onTitleChange(e.target.value)}
          placeholder="Ex: Teste de bateria"
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {testTitleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handlers.onTitleChange(suggestion)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Medições</label>
        {renderMeasurementRows(
          draft.measurements,
          handlers.onMeasurementChange,
          handlers.onAddRow,
          handlers.onRemoveRow,
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Veredito</label>
        <select
          value={draft.verdict}
          onChange={(e) => handlers.onVerdictChange(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-64"
        >
          <option value="">Sem veredito ainda</option>
          <option value="approved">Aprovado</option>
          <option value="failed">Reprovado</option>
          <option value="inconclusive">Inconclusivo</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Observações</label>
        <textarea
          value={draft.notes}
          onChange={(e) => handlers.onNotesChange(e.target.value)}
          placeholder="Explique o que foi analisado neste teste..."
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="flex gap-2">
        <Button
          className="bg-lime-400 text-black hover:bg-lime-500"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar teste"}
        </Button>

        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );

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

              <Button
                variant="outline"
                onClick={() => navigate(`/os/${data.service_order_id}/finalizar`)}
              >
                Finalizar OS
              </Button>

              <Button
                variant="outline"
                onClick={handleDownloadReport}
                disabled={downloadingReport}
              >
                {downloadingReport ? "Gerando PDF..." : "Baixar laudo PDF"}
              </Button>

              {data.promo_video_status === "ready" && promoVideoMedia?.url ? (
                <Button
                  className="bg-lime-400 text-black hover:bg-lime-500"
                  onClick={() => window.open(promoVideoMedia.url, "_blank")}
                >
                  Baixar vídeo de divulgação
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleGeneratePromoVideo}
                  disabled={
                    triggeringPromoVideo ||
                    data.promo_video_status === "processing"
                  }
                >
                  {data.promo_video_status === "processing"
                    ? "Gerando vídeo..."
                    : data.promo_video_status === "failed"
                    ? "Falha ao gerar — tentar de novo"
                    : "Gerar vídeo de divulgação"}
                </Button>
              )}
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

                  <div className="space-y-4">
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Testes realizados
                      </h3>

                      {section.tests.length === 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Nenhum teste registrado nesta etapa ainda.
                        </p>
                      )}

                      <div className="mt-4 space-y-4">
                        {section.tests.map((test) => (
                          <div key={test.test_id} className="space-y-3 rounded-2xl border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-medium">{test.title}</h4>
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getVerdictPillClass(
                                  test.verdict
                                )}`}
                              >
                                {test.verdict ? verdictLabels[test.verdict] : "Sem veredito"}
                              </span>
                            </div>

                            {test.test_type === "bateria" && test.data && (
                              <BateriaCard data={test.data as unknown as BateriaData} />
                            )}

                            {test.test_type === "leitura_dtc" && test.data && (
                              <LeituraDtcCard data={test.data as unknown as LeituraDtcData} />
                            )}

                            {test.test_type === "compressao_mecanica" && test.data && (
                              <CompressaoMecanicaCard
                                data={test.data as unknown as CompressaoMecanicaData}
                                sectionMedias={section.medias}
                              />
                            )}

                            {test.test_type === "injetores_banco" && test.data && (
                              <InjetoresBancoCard
                                data={test.data as unknown as InjetoresBancoData}
                                sectionMedias={section.medias}
                              />
                            )}

                            {!test.test_type && test.measurements && test.measurements.length > 0 && (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="pb-1 pr-2 font-medium">Item</th>
                                    <th className="pb-1 pr-2 font-medium">Esperado</th>
                                    <th className="pb-1 font-medium">Obtido</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {test.measurements.map((measurement, index) => (
                                    <tr key={index} className="border-t">
                                      <td className="py-1 pr-2">{measurement.label}</td>
                                      <td className="py-1 pr-2 text-muted-foreground">
                                        {measurement.expected || "-"}
                                      </td>
                                      <td className="py-1">{measurement.actual}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {test.notes && (
                              <p className="whitespace-pre-line text-sm text-muted-foreground">
                                {test.notes}
                              </p>
                            )}

                            <div className="flex gap-2">
                              {!test.test_type && (
                                <Button variant="outline" onClick={() => handleOpenEditTest(test)}>
                                  {editingTestId === test.test_id ? "Fechar edição" : "Editar teste"}
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                onClick={() => handleDeleteTest(test.test_id)}
                                disabled={deletingTestId === test.test_id}
                              >
                                {deletingTestId === test.test_id ? "Excluindo..." : "Excluir teste"}
                              </Button>
                            </div>

                            {editingTestId === test.test_id && editingTestDraft && (
                              <div className="rounded-2xl border bg-background p-4">
                                {renderTestFormBody(
                                  editingTestDraft,
                                  {
                                    onTitleChange: (value) => updateEditTestField("title", value),
                                    onVerdictChange: (value) => updateEditTestField("verdict", value),
                                    onNotesChange: (value) => updateEditTestField("notes", value),
                                    onMeasurementChange: updateEditTestMeasurement,
                                    onAddRow: addEditTestMeasurementRow,
                                    onRemoveRow: removeEditTestMeasurementRow,
                                  },
                                  () => handleUpdateTest(test.test_id),
                                  () => {
                                    setEditingTestId(null);
                                    setEditingTestDraft(null);
                                  },
                                  savingEditTestId === test.test_id
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {openTestSectionId === section.section_id &&
                        !newTestTypeBySection[section.section_id] && (
                          <div className="mt-4">
                            <TestTypeSelector
                              onSelect={(type) =>
                                setNewTestTypeBySection((prev) => ({
                                  ...prev,
                                  [section.section_id]: type,
                                }))
                              }
                            />
                          </div>
                        )}

                      {openTestSectionId === section.section_id &&
                        newTestTypeBySection[section.section_id] === "generic" && (
                          <div className="mt-4 rounded-2xl border bg-background p-4">
                            <h4 className="mb-4 font-medium">Novo teste</h4>
                            {renderTestFormBody(
                              testDraftBySection[section.section_id] ?? emptyTestDraft(),
                              {
                                onTitleChange: (value) =>
                                  updateNewTestField(section.section_id, "title", value),
                                onVerdictChange: (value) =>
                                  updateNewTestField(section.section_id, "verdict", value),
                                onNotesChange: (value) =>
                                  updateNewTestField(section.section_id, "notes", value),
                                onMeasurementChange: (index, field, value) =>
                                  updateNewTestMeasurement(section.section_id, index, field, value),
                                onAddRow: () => addNewTestMeasurementRow(section.section_id),
                                onRemoveRow: (index) =>
                                  removeNewTestMeasurementRow(section.section_id, index),
                              },
                              () => handleCreateTest(section.section_id),
                              () => setOpenTestSectionId(null),
                              savingTestSectionId === section.section_id
                            )}
                          </div>
                        )}

                      {openTestSectionId === section.section_id &&
                        newTestTypeBySection[section.section_id] === "bateria" && (
                          <div className="mt-4 rounded-2xl border bg-background p-4">
                            <BateriaForm
                              saving={savingTestSectionId === section.section_id}
                              onCancel={() => setOpenTestSectionId(null)}
                              onSave={(payload) =>
                                handleSaveSpecializedTest(section.section_id, "bateria", payload)
                              }
                            />
                          </div>
                        )}

                      {openTestSectionId === section.section_id &&
                        newTestTypeBySection[section.section_id] === "leitura_dtc" && (
                          <div className="mt-4 rounded-2xl border bg-background p-4">
                            <LeituraDtcForm
                              saving={savingTestSectionId === section.section_id}
                              onCancel={() => setOpenTestSectionId(null)}
                              onSave={(payload) =>
                                handleSaveSpecializedTest(section.section_id, "leitura_dtc", payload)
                              }
                            />
                          </div>
                        )}

                      {openTestSectionId === section.section_id &&
                        newTestTypeBySection[section.section_id] === "compressao_mecanica" && (
                          <div className="mt-4 rounded-2xl border bg-background p-4">
                            <CompressaoMecanicaForm
                              sectionId={section.section_id}
                              saving={savingTestSectionId === section.section_id}
                              onCancel={() => setOpenTestSectionId(null)}
                              onSave={(payload) =>
                                handleSaveSpecializedTest(
                                  section.section_id,
                                  "compressao_mecanica",
                                  payload
                                )
                              }
                            />
                          </div>
                        )}

                      {openTestSectionId === section.section_id &&
                        newTestTypeBySection[section.section_id] === "injetores_banco" && (
                          <div className="mt-4 rounded-2xl border bg-background p-4">
                            <InjetoresBancoForm
                              sectionId={section.section_id}
                              saving={savingTestSectionId === section.section_id}
                              onCancel={() => setOpenTestSectionId(null)}
                              onSave={(payload) =>
                                handleSaveSpecializedTest(
                                  section.section_id,
                                  "injetores_banco",
                                  payload
                                )
                              }
                            />
                          </div>
                        )}
                    </div>
                  </div>

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
                      variant="outline"
                      onClick={() => handleOpenTestForm(section.section_id)}
                    >
                      {openTestSectionId === section.section_id
                        ? "Fechar teste"
                        : "Adicionar teste"}
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