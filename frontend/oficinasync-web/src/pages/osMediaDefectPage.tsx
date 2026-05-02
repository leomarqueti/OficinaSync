import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function OsMediaDefectPage() {
  const navigate = useNavigate();

  const [type, setType] = useState("photo");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const sendData = async () => {
    const token = localStorage.getItem("token");
    const sectionId = localStorage.getItem("current_section_id");

    if (!token) {
      console.error("Token não encontrado");
      return;
    }

    if (!sectionId) {
      console.error("Id da section não encontrado");
      return;
    }

    if (!file) {
      console.error("Arquivo não selecionado");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("section_id", sectionId);
    formData.append("type", type);
    formData.append("label", label);

    try {
      const response = await fetch("http://localhost:3000/medias", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      console.log("status:", response.status);
      console.log("result:", result);

      if (response.ok) {
        navigate("/os-entry-photos");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <>
      <div className="grid min-h-screen w-full grid-cols-1">
        <div className="bg-white flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-3xl">
            <CardHeader className="p-0 text-left">
              <CardDescription className="mt-2 text-sm">
                PASSO 5 DE 5
              </CardDescription>

              <CardTitle className="text-3xl font-bold tracking-tight">
                Adicionar mídia
              </CardTitle>

              <Progress value={100} className="mt-4" />
            </CardHeader>

            <CardContent className="p-0 mt-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type">Tipo da mídia</Label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="photo">Foto</option>
                    <option value="video">Vídeo</option>
                    <option value="audio">Áudio</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="label">Legenda</Label>
                  <Input
                    id="label"
                    type="text"
                    placeholder="Ex: Painel aceso no momento da entrada"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="file">Arquivo</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] ?? null;
                      setFile(selectedFile);
                    }}
                  />
                </div>

                <Button
                  className="w-full bg-lime-400 text-black hover:bg-lime-500"
                  onClick={sendData}
                >
                  Finalizar fluxo
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </>
  );
}