import styles from "./Home.module.css";
import Header from "../components/header";

//futura logica de autenticação
function Pop() {
  alert("Teste");
}

function Home() {
  return (
    <>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>OficinaSync Em construçao</h1>
        {/*<Botao title="Clique aqui" aoClicar={Pop} /> */}
      </div>
    </>
  );
}

export default Home;
