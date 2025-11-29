import Image from "next/image";
import styles from "./Header.module.css";
import Botao from "../botao";

function Header() {
  return (
    <header className={styles.headerContainer}>
      <div className={styles.leftGroup}>
        <Image
          className={styles.img}
          width={80}
          height={40}
          src="/assets/images/Logo.png"
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
        <Botao title={"Login"} />
        <Botao title={"Cadastrar"} />
      </div>
    </header>
  );
}

export default Header;
