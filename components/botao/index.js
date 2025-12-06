// essa costante é a base dos estilos do botao, todos os botoes vao ter os configuraçoes dessa constante, mudou aqui, muda tudo
const baseStyles = "transition-all duration-300";

//Variaçoes de estilos dos botoes, se quiser modificar algo de algum botao é aqui.
const variants = {
  primary: "bg-sync-green hover:opacity-50 text-black rounded-xl h-12 px-4", // Botão (Login)
  secondary:
    "bg-transparent border-2 border-sync-green text-sync-green hover:bg-sync-green hover:text-black rounded-xl h-12 px-4",
  demostration:
    "bg-sync-green hover:opacity-50 text-black rounded-xl w-44 h-12 px-4 font-bold",
};

// Aqui temos a funcão principal do botao, a base de tudo esta aqui ,qualquer logica referente a ação do botao esta aqui
function Botao({ title, aoClicar, variant = "primary" }) {
  return (
    <button className={`${baseStyles} ${variants[variant]}`} onClick={aoClicar}>
      {title}
    </button>
  );
}

export default Botao;
