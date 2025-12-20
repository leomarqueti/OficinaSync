import Image from "next/image";

function Hero2() {
  return (
    <section className="bg-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 md:flex-row md:gap-16">
        <div className="flex w-full flex-1 justify-center md:justify-end">
          <Image
            alt="Foto do scanner automotivo"
            src="/assets/images/image2.png"
            width={800}
            height={800}
            sizes="(max-width: 768px) 90vw, 45vw"
            className="h-auto w-full max-w-xs object-contain sm:max-w-sm md:max-w-md lg:max-w-lg"
          />
        </div>
        <div className="flex w-full flex-1 flex-col gap-4 text-center text-white md:text-left">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            A nova forma
            <span className="block">de gerenciar</span>
            <span className="block">sua oficina</span>
          </h1>
          <p className="text-sm text-white/80 sm:text-base">
            Checklist moderno, diagnóstico <br className="hidden sm:block" />e
            cliente feliz
          </p>
        </div>
      </div>
    </section>
  );
}

export default Hero2;
