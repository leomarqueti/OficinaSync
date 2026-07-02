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
import { API_URL } from "@/lib/api";

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
      const serviceOrderResponse = await fetch(`${API_URL}/service_orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawDataCreateServiceOrder),
      });

      const serviceOrderResult = await serviceOrderResponse.json();

      console.log("service order status:", serviceOrderResponse.status);
      console.log("service order result:", serviceOrderResult);

      if (!serviceOrderResponse.ok) {
        return;
      }

      const serviceOrderId = serviceOrderResult.service_order_id;

      localStorage.setItem(
        "current_service_order_id",
        String(serviceOrderId)
      );

      // cria uma section inicial automaticamente
      const rawDataCreateSection = {
        service_order_id: Number(serviceOrderId),
        type: "diagnosis",
        notes: clientComplaint,
      };

      const sectionResponse = await fetch(`${API_URL}/sections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawDataCreateSection),
      });

      const sectionResult = await sectionResponse.json();

      console.log("section status:", sectionResponse.status);
      console.log("section result:", sectionResult);

      if (!sectionResponse.ok) {
        return;
      }

      localStorage.setItem(
        "current_section_id",
        String(sectionResult.section_id)
      );

      navigate("/os-media-upload");
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