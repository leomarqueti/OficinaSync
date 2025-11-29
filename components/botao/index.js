import styles from "./Botao.module.css";

function Botao({ title, aoClicar }) {
  return (
    <button className={styles.botao} onClick={aoClicar}>
      {title}
    </button>
  );
}

export default Botao;
