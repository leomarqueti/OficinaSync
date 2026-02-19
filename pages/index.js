import Header from "../components/header";
import Hero from "../components/hero";
import Hero2 from "../components/Hero2";
import OficinaSync from "../components/oficinaSync";

//futura logica de autenticação
function Pop() {
  alert("Teste");
}

//componente principal
function Home() {
  return (
    <>
      <OficinaSync />
    </>
  );
}

export default Home;
