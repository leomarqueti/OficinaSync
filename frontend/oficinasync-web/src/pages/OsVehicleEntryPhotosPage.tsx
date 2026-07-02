import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { API_URL } from "@/lib/api";

export function OsVehicleEntryPhotosPage() {
  const navigate = useNavigate();

  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [rearPhoto, setRearPhoto] = useState<File | null>(null);
  const [leftPhoto, setLeftPhoto] = useState<File | null>(null);
  const [rightPhoto, setRightPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadSingleMedia = async (
    file: File,
    label: string,
    sectionId: number,
    token: string
  ) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("section_id", String(sectionId));
    formData.append("type", "photo");
    formData.append("label", label);

    const response = await fetch(`${API_URL}/medias`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    console.log(`upload ${label} status:`, response.status);
    console.log(`upload ${label} result:`, result);

    if (!response.ok) {
      throw new Error(`Erro ao enviar ${label}`);
    }

    return result;
  };

  const publishSection = async (sectionId: number, token: string) => {
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

    console.log("publish section status:", response.status);
    console.log("publish section result:", result);

    if (!response.ok) {
      throw new Error("Erro ao publicar section");
    }

    return result;
  };

  const sendData = async () => {
    const token = localStorage.getItem("token");
    const serviceOrderId = localStorage.getItem("current_service_order_id");

    console.log("OS usada na tela das 4 fotos:", serviceOrderId);

    if (!token) {
      console.error("Token não encontrado");
      return;
    }

    if (!serviceOrderId) {
      console.error("Id da ordem de serviço não encontrado");
      return;
    }

    if (!frontPhoto || !rearPhoto || !leftPhoto || !rightPhoto) {
      console.error("As 4 fotos são obrigatórias");
      return;
    }

    try {
      setLoading(true);

      const sectionResponse = await fetch(`${API_URL}/sections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_order_id: Number(serviceOrderId),
          type: "checkin",
          notes: "Registro fotográfico da entrada do veículo.",
        }),
      });

      const sectionResult = await sectionResponse.json();

      console.log("checkin section status:", sectionResponse.status);
      console.log("checkin section result:", sectionResult);

      if (!sectionResponse.ok) {
        console.error("Erro ao criar section de check-in:", sectionResult);
        return;
      }

      const sectionId = Number(
        sectionResult.section_id ??
          sectionResult.id ??
          sectionResult.section?.section_id
      );

      if (!sectionId) {
        console.error("ID da section inválido:", sectionResult);
        return;
      }

      await Promise.all([
        uploadSingleMedia(frontPhoto, "Frente do veículo", sectionId, token),
        uploadSingleMedia(rearPhoto, "Traseira do veículo", sectionId, token),
        uploadSingleMedia(
          leftPhoto,
          "Lado esquerdo do veículo",
          sectionId,
          token
        ),
        uploadSingleMedia(
          rightPhoto,
          "Lado direito do veículo",
          sectionId,
          token
        ),
      ]);

      await publishSection(sectionId, token);

      navigate("/dashboard");
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderFileInput = (
    id: string,
    label: string,
    file: File | null,
    onChange: (file: File | null) => void
  ) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>

      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] ?? null;
          onChange(selectedFile);
        }}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-lime-100 file:px-3 file:py-1.5 file:text-sm"
      />

      {file && (
        <span className="text-xs text-muted-foreground">
          Arquivo selecionado: {file.name}
        </span>
      )}
    </div>
  );

  return (
    <div className="grid min-h-screen w-full grid-cols-1">
      <div className="bg-white flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-4xl">
          <CardHeader className="p-0 text-left">
            <CardDescription className="mt-2 text-sm">
              PASSO FINAL
            </CardDescription>

            <CardTitle className="text-3xl font-bold tracking-tight">
              Fotos de entrada do veículo
            </CardTitle>

            <p className="mt-2 text-sm text-muted-foreground">
              Tire as 4 fotos principais para registrar como o veículo chegou na oficina.
            </p>

            <Progress value={100} className="mt-4" />
          </CardHeader>

          <CardContent className="p-0 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {renderFileInput(
                "frontPhoto",
                "Frente",
                frontPhoto,
                setFrontPhoto
              )}

              {renderFileInput(
                "rearPhoto",
                "Traseira",
                rearPhoto,
                setRearPhoto
              )}

              {renderFileInput(
                "leftPhoto",
                "Lado esquerdo",
                leftPhoto,
                setLeftPhoto
              )}

              {renderFileInput(
                "rightPhoto",
                "Lado direito",
                rightPhoto,
                setRightPhoto
              )}

              <div className="md:col-span-2 pt-2">
                <Button
                  className="w-full bg-lime-400 text-black hover:bg-lime-500"
                  onClick={sendData}
                  disabled={loading}
                >
                  {loading
                    ? "Salvando e publicando..."
                    : "Finalizar e ir para dashboard"}
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}