    /* eslint-disable react-hooks/rules-of-hooks */
    import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
    import { Input } from "@/components/ui/input";
    import { useState } from "react";
    import { Button } from "@/components/ui/button";
    import { Label } from "@/components/ui/label";
    import { Progress } from "@/components/ui/progress";
    import { useNavigate } from "react-router-dom";

    //oficinasyncemailteste@gmail.com
    //72547623000190

    export function UserRegisterPage(){

        const navigate = useNavigate();
        const [name, setName] = useState('');
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [passwordConfirm, setPasswordConfirm] = useState('');
        

        const sendData = async () => {
            

            if (password != passwordConfirm) {
                console.log("semha diferente")
                return
            }

            const rawDataRegisterUser = {
                name: name,
                email: email,
                password: password
            }
        

            try {
            
                const response = await fetch('http://localhost:3000/auth/register', {
                    method: 'POST',
                    headers: {
                    
                    'Content-Type': 'application/json' 
                    },
                    
                    body: JSON.stringify(rawDataRegisterUser) 
                });
                

                const result = await response.json();

                console.log("status:", response.status);
                console.log("result:", result);

                if (result.onboarding_token) {
                    localStorage.setItem("token", result.onboarding_token);
                    navigate("/tenant-register");
                }
            
                
                
                
            } catch (error) {
                console.error('Erro:', error)
            }

        }
                

        return (
            <>

                <CardHeader className="p-6 text-center w-70 text-left gap-3">
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Criar sua conta
                    </CardTitle>

                    <CardDescription className="mt-2 text-sm">
                        Passo 1 de 3 - Dados de acesso
                    </CardDescription>

                    <Progress value={33}/>
                </CardHeader>


                <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <Label>Nome completo</Label>
                        <Input id="nome" type="text" placeholder="Ex: Kessya Yasmine Marqueti" value={name} onChange={(e) => setName(e.target.value)}/>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Email</Label>
                        <Input id="email" type="email" placeholder='seuemail@gmail.com' value={email} onChange={(e) => setEmail(e.target.value)}/>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Senha</Label>
                        <Input id="senha" type="password" placeholder='Crie um senha segura' value={password} onChange={(e) => setPassword(e.target.value)}/>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Confirmar senha</Label>
                        <Input id="senha" type="password" placeholder='Repita a senha' value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}/>
                    </div>


                    <Button onClick={sendData}>Continuar</Button>
                </CardContent>
            </>
        )
    }