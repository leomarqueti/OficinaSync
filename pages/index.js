import Header from "../components/header";
import Hero from "../components/hero";
import Hero2 from "../components/hero2";

//futura logica de autenticação
function Pop() {
  alert("Teste");
}

//componente principal
function Home() {
  return (
    <>
      <Header />
      <Hero />

      <Hero2 />
    </>
  );
}

export default Home;
