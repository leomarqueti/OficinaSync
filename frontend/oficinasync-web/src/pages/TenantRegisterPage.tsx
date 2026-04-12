import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";


export function TenantRegisterPage(){
    const navigate = useNavigate();
    const [name, setName] = useState("")
    const [cnpj, setCnpj] = useState("")
    const [phone, setPhone] = useState("")

    const sendData = async () => {
    const token = localStorage.getItem("token")

    const rawDataRegisterTenants = {
        name,
        cnpj,
        phone,
    }

    try {
        const response = await fetch("http://localhost:3000/tenants", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawDataRegisterTenants),
        })

        const result = await response.json()
        console.log("sucesso", result)
        navigate("/email-send")
    } catch (error) {
        console.error("Erro:", error)
    }
    }
            

    return (
        <>
            <CardHeader className="p-6 text-center w-70 text-left gap-3">
                <CardTitle className="text-3xl font-bold tracking-tight">
                    Registre sua oficina
                </CardTitle>

                <CardDescription className="mt-2 text-sm">
                    Passo 2 de 3 - Dados de acesso
                </CardDescription>

                <Progress value={66}/>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                    <Label>Nome completo</Label>
                    <Input id="nome" type="text" placeholder="Ex: Sua oficina" value={name} onChange={(e) => setName(e.target.value)}/>
                </div>

                 <div className="flex flex-col gap-2">
                    <Label>CNPJ</Label>
                    <Input id="cnpj" type="text" placeholder='99.999.999/9999-99' value={cnpj} onChange={(e) => setCnpj(e.target.value)}/>
                </div>

                <div className="flex flex-col gap-2">
                    <Label>Telefone</Label>
                    <Input id="telefone" type="phone" placeholder='(99) 99999-9999' value={phone} onChange={(e) => setPhone(e.target.value)}/>
                </div>

                <Button onClick={sendData}>Continuar</Button>
            </CardContent>
        </>
    )
}