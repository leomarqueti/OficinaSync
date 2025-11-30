import styles from "./Botao.module.css";
const baseStyles = "transition-all duration-300"


const variants = {
    primary: "bg-sync-green hover:opacity-50 text-black rounded-xl px-5 py-3", // Botão (Login)
    secondary: "bg-transparent border-2 border-sync-green text-sync-green hover:bg-sync-green hover:text-black rounded-xl px-5 py-3"
  };

function Botao({ title, aoClicar, variant="primary" }) {
  return (
    <button className={`${baseStyles} ${variants[variant]}`} onClick={aoClicar}>
      {title}
    </button>
  );
}

export default Botao;
