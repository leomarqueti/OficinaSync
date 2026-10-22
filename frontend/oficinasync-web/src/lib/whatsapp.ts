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

/** Convite de funcionário pelo WhatsApp: o link de uso único vale 24 horas. */
export function whatsappInviteUrl(phoneE164: string, name: string, tenantName: string, link: string): string {
  const first = firstName(name);
  const text = `${first ? `Olá, ${first}!` : "Olá!"} Você foi cadastrado na ${tenantName} no OficinaSync. Toque no link pra criar seu PIN e entrar (vale por 24 horas): ${link}`;
  return `https://wa.me/${phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
