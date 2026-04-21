import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

export function OsVehicleDefectPage() {
  const navigate = useNavigate();
  const [clientComplaint, setClientComplaint] = useState("");

  const sendData = async () => {
    const token = localStorage.getItem("token");
    const carId = localStorage.getItem("current_car_id");

    if (!token) {
      console.error("Token não encontrado");
      return;
    }

    if (!carId) {
      console.error("Id do carro não encontrado");
      return;
    }

    const rawDataCreateServiceOrder = {
      car_id: Number(carId),
      client_complaint: clientComplaint,
    };

    try {
      const response = await fetch("http://localhost:3000/service_orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawDataCreateServiceOrder),
      });

      const result = await response.json();

      console.log("status:", response.status);
      console.log("result:", result);

      if (response.ok) {
        localStorage.setItem(
          "current_service_order_id",
          String(result.service_order_id)
        );
        navigate("/dashboard");
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
                PASSO 3 DE 5
              </CardDescription>

              <CardTitle className="text-3xl font-bold tracking-tight">
                Qual é o defeito do veículo?
              </CardTitle>

              <Progress value={62} className="mt-4" />
            </CardHeader>

            <CardContent className="p-0 mt-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientComplaint">
                    Descreva o problema relatado pelo cliente
                  </Label>

                  <textarea
                    id="clientComplaint"
                    placeholder="Ex: veículo falha ao ligar de manhã, painel oscila e a bateria descarrega com frequência..."
                    value={clientComplaint}
                    onChange={(e) => setClientComplaint(e.target.value)}
                    className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <Button
                  className="w-full bg-lime-400 text-black hover:bg-lime-500"
                  onClick={sendData}
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </>
  );
}