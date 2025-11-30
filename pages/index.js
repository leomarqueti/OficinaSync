import Header from "../components/header";

//futura logica de autenticação
function Pop() {
  alert("Teste");
}

//componente principal
function Home() {
  return (
    <>
      <Header />
      <div className="grid h-screen place-items-center bg-black">
        <h1 className="text-5xl font-bold text-sync-green">
          OficinaSync Em construçao
        </h1>
        {/*<Botao title="Clique aqui" aoClicar={Pop} /> */}
      </div>
    </>
  );
}

export default Home;
