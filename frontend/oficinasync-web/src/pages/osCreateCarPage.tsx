import { useNavigate } from "react-router-dom";
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
import { useState } from "react";

export function OsCreateCarPage() {
  const navigate = useNavigate();

  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuel, setFuel] = useState("");
  const [chassis, setChassis] = useState("");
  const [color, setColor] = useState("");
  const [mileageIn, setMileageIn] = useState("");

  const sendData = async () => {
    const id = localStorage.getItem("current_client_id");

    if (!id) {
      console.log("Id do cliente não encontrado");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Token não encontrado");
      return;
    }

    const rawDataRegisterCar = {
      plate,
      brand,
      model,
      year: year ? Number(year) : null,
      fuel_type: fuel,
      chassis,
      color,
      mileage_in: mileageIn ? Number(mileageIn) : null,
      client_id: Number(id),
    };

    try {
      const response = await fetch("http://localhost:3000/cars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawDataRegisterCar),
      });

      const result = await response.json();

      console.log("status:", response.status);
      console.log("result:", result);

      if (response.ok) {
        localStorage.setItem("current_car_id", String(result.car_id));
        navigate("/os-defect-create");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <>
      <div className="grid min-h-screen w-full grid-cols-1">
        <div className="bg-white flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-4xl">
            <CardHeader className="p-0 text-left">
              <CardDescription className="mt-2 text-sm">
                PASSO 2 DE 5
              </CardDescription>

              <CardTitle className="text-3xl font-bold tracking-tight">
                Qual é o veículo?
              </CardTitle>

              <Progress value={42} className="mt-4" />
            </CardHeader>

            <CardContent className="p-0 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    type="text"
                    placeholder="Ex: ABC-1234"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    type="text"
                    placeholder="Ex: Volkswagen"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    type="text"
                    placeholder="Ex: Gol 1.0"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="Ex: 2015"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="fuel">Combustível</Label>
                  <Input
                    id="fuel"
                    type="text"
                    placeholder="Ex: Flex"
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    type="text"
                    placeholder="Ex: Prata"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="chassis">Chassi</Label>
                  <Input
                    id="chassis"
                    type="text"
                    placeholder="Ex: 9BWZZZ377VT004251"
                    value={chassis}
                    onChange={(e) => setChassis(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="mileageIn">Quilometragem de entrada</Label>
                  <Input
                    id="mileageIn"
                    type="number"
                    placeholder="Ex: 125000"
                    value={mileageIn}
                    onChange={(e) => setMileageIn(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <Button
                    className="w-full bg-lime-400 text-black hover:bg-lime-500"
                    onClick={sendData}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </>
  );
}