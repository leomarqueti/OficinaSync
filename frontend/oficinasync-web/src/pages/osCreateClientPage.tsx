import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

export function OsCreateClientPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");

  const sendData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Token não encontrado");
      return;
    }

    const rawDataRegisterClient = {
      name,
      phone,
      email,
      cpf,
      address,
    };

    try {
      const response = await fetch("http://localhost:3000/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawDataRegisterClient),
      });

      const result = await response.json();

      console.log("status:", response.status);
      console.log("result:", result);

      if (response.ok) {
        localStorage.setItem("current_client_id", String(result.client_id));
        navigate("/os-car-create");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <>
      <div className="grid min-h-screen w-full grid-cols-1 2">
        <div className="bg-white flex items-center justify-center p-8 md:p-12">
          <div className="w-full max-w-md">
            <CardHeader className="p-0 text-left">
              <CardDescription className="mt-2 text-sm">
                PASSO 1 DE 5
              </CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">
                Quem é o cliente?
              </CardTitle>

              <Progress value={22} />
            </CardHeader>

            <CardContent className="flex flex-col gap-4 p-0 mt-8">
              <div className="flex flex-col gap-2">
                <Label>Nome completo</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Ex: Diogo Deleon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>WhatsApp/Telefone</Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="(14) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="999.999.999-99"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Endereço</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Rua: Sebastião Cadeldeira da Silva 225"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ex: hera2026@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-lime-400 text-black hover:bg-lime-500"
                onClick={sendData}
              >
                Continuar
              </Button>
            </CardContent>
          </div>
        </div>
      </div>
    </>
  );
}