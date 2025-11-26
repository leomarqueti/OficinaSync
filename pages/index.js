import styles from "./Home.module.css";
import logo from "./assets/images/Logo.png";
import Image from "next/image";

function Home() {
  return (
    <div className={styles.container}>
      <Image src={logo} />
      <h1 className={styles.title}>OficinaSync Em construçao</h1>;
    </div>
  );
}

export default Home;
