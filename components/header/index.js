import Image from "next/image";
import styles from "./Header.module.css";
import Botao from "../botao";

function Header() {
  return (
    <header className={styles.headerContainer}>
      <div className={styles.leftGroup}>
        <Image
          //Acessibilidade para o google
          alt="Logo Oficina Sync"
          width={213}
          height={108}
          //Caminho da imagem
          src="/assets/images/Logo.png"
          //h é a altura , w para largura auto e cursor-pointer para a maozinhe o contain server para nao achatar a imagem
          className="h-20 w-auto cursor-pointer object-contain"
        />
      </div>
      <div className={styles.centerGroup}>
        <nav className={styles.nav}>
          <a className={styles.a} href="#">
            Home
          </a>
          <a className={styles.a} href="#">
            Sobre
          </a>
          <a className={styles.a} href="#">
            Planos
          </a>
        </nav>
      </div>
      <div className={styles.rightGroup}>
        <Botao title={"Login"} variant="primary" />
        <Botao title={"Cadastrar"} variant="secondary" />
      </div>
    </header>
  );
}

export default Header;
