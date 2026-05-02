import {  CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "../components/ui/separator";
import { useNavigate } from "react-router-dom";
import logoOficinaSync from "@/assets/logoOficinaSync.png"


export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const sendData = async () => {
        const rawDataLogin = {
            email,
            password,
        };

        try {
            const response = await fetch("http://localhost:3000/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(rawDataLogin),
            });

            const result = await response.json();

            if (result.access_token) {
                localStorage.setItem("token", result.access_token);
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Erro:", error);
        }


    }
            

    return (
        <>
            
                <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
                    <div className="hidden md:flex bg-black items-center justify-center p-10">
                    <img
                        src={logoOficinaSync}
                        alt="Oficina Sync"
                        className="w-72 h-auto object-contain"
                    />
                    </div>

                    <div className="bg-white flex items-center justify-center p-8 md:p-12">
                    <div className="w-full max-w-md">
                        <CardHeader className="p-0 text-left">
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            Olá, mecânico! 👋
                        </CardTitle>

                        <CardDescription className="mt-2 text-sm">
                            Entre na sua conta para acessar as ordens de serviço
                        </CardDescription>
                        </CardHeader>

                        <CardContent className="flex flex-col gap-4 p-0 mt-8">
                        <div className="flex flex-col gap-2">
                            <Label>Email</Label>
                            <Input
                            id="email"
                            type="email"
                            placeholder="seuemail@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Senha</Label>
                            <Input
                            id="senha"
                            type="password"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button  variant="link" className="justify-start px-0">
                            Esqueceu a senha?
                        </Button>

                        <Button className="w-full bg-lime-400 text-black hover:bg-lime-500" onClick={sendData}>
                            Entrar no sistema
                        </Button>
                        </CardContent>

                        <div className="mt-8">
                        <div className="flex items-center gap-3">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">ou</span>
                            <Separator className="flex-1" />
                        </div>

                        <p className="mt-4 text-center text-sm text-muted-foreground">
                            Não tem conta?{" "}
                            <span className="font-semibold text-green-500">
                            Criar grátis →
                            </span>
                        </p>
                        </div>
                    </div>
                    </div>
                </div>
               
            </>
    )
}