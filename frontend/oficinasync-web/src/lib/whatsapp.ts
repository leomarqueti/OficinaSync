// Link do WhatsApp (wa.me) com a mensagem pronta pro cliente acompanhar o serviço.
// Não usa API do WhatsApp: abre o app no celular do mecânico, ele só aperta enviar.

function firstName(name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
}

export function whatsappShareUrl({
  phone,
  clientName,
  carName,
  link,
}: {
  phone: string | null | undefined;
  clientName: string | null | undefined;
  carName: string;
  link: string;
}): string {
  const name = firstName(clientName);
  const car = carName && !/sem modelo/i.test(carName) ? `seu ${carName}` : "seu veículo";
  const text = `${name ? `Olá, ${name}!` : "Olá!"} Acompanhe o serviço do ${car} por aqui, com fotos e explicação de cada etapa: ${link}`;
  const digits = (phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
