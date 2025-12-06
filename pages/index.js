import Header from "../components/header";
import Hero from "../components/hero";

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
        <Hero />
      </div>
      <div className="grid h-screen place-items-center bg-neutral-900">
        <h1 className="font-bold text-sync-green text-5xl">Em construção</h1>
      </div>
    </>
  );
}

export default Home;
