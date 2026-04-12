    /* eslint-disable react-hooks/rules-of-hooks */
    import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
    import { Button } from "@/components/ui/button";
    import { Progress } from "@/components/ui/progress";
    import { useNavigate } from "react-router-dom";



    export function EmailSendPage(){

        const navigate = useNavigate();

        return (
            <>

                <CardHeader className="p-6 text-center w-70 text-left gap-3">
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Criar sua conta
                    </CardTitle>

                    <CardDescription className="mt-2 text-sm">
                        Passo 3 de 3 - Dados de acesso
                    </CardDescription>

                    <Progress value={100}/>
                </CardHeader>


                <CardContent className="flex flex-col gap-3">
                    
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Email enviado com sucesso!
                    </CardTitle>

                    <CardDescription className="mt-2 text-sm">
                        Verifique seu email
                    </CardDescription>

                    <Button onClick={() => {
                        navigate("/login")
                    }}>Ir para login</Button>

                    
                </CardContent>
            </>
        )
    }