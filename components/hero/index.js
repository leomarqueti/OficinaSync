import Image from "next/image";
import Botao from "../botao";

function Hero() {
  return (
    <div className="flex items-center">
      <div className="flex flex-col gap-4 text-white">
        <h1 className="text-6xl font-bold">
          A nova forma <br /> de gerenciar <br /> sua oficina
        </h1>
        <p>
          Checklist Morderno, Diagnostico <br />e cliente feliz
        </p>
        <Botao title={"Ver demonstração"} variant="demostration" />
      </div>
      <Image
        alt="Foto do scanner automotivo"
        src="/assets/images/image_scanner.png"
        width={857}
        height={857}
        className="h-3/4 w-auto"
      />
    </div>
  );
}

export default Hero;
