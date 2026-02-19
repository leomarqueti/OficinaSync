import React, { useState } from "react";

// Estilos CSS em JavaScript
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%);
    color: #1e293b;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
  }

  header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .header-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
  }

  .logo-text h1 {
    font-size: 1.25rem;
    color: #1e293b;
    margin: 0;
  }

  .logo-text p {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .info-text {
    text-align: right;
    display: none;
  }

  @media (min-width: 640px) {
    .info-text {
      display: block;
    }
  }

  .info-text p {
    font-size: 0.875rem;
    margin: 0;
  }

  .info-text .os-number {
    font-weight: 600;
    color: #1e293b;
  }

  .info-text .update-time {
    color: #64748b;
    font-size: 0.75rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .hero {
    position: relative;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    height: 384px;
  }

  .hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.6), transparent);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2rem;
  }

  .hero-content h2 {
    font-size: 2.25rem;
    color: white;
    margin-bottom: 0.5rem;
  }

  .hero-content p {
    font-size: 1.25rem;
    color: white;
    margin-bottom: 1rem;
  }

  .hero-content .subtitle {
    font-size: 1.125rem;
    color: #86efac;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }

  .hero-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  button {
    padding: 0.625rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: #16a34a;
    color: white;
  }

  .btn-primary:hover {
    background: #15803d;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid white;
    color: white;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .card-header.blue {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-bottom-color: #bfdbfe;
  }

  .card-header.purple {
    background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
    border-bottom-color: #e9d5ff;
  }

  .card-header.red {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-bottom-color: #fecaca;
  }

  .card-header.amber {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border-bottom-color: #fde68a;
  }

  .card-header.green {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-bottom-color: #bbf7d0;
  }

  .card-header.teal {
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
    border-bottom-color: #99f6e4;
  }

  .card-header.indigo {
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border-bottom-color: #c7d2fe;
  }

  .card-header.pink {
    background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
    border-bottom-color: #fbcfe8;
  }

  .card-header h3 {
    font-size: 1.125rem;
    margin-bottom: 0.25rem;
  }

  .card-header p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
  }

  .card-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-content h4 {
    font-size: 0.875rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .card-content p {
    color: #334155;
    font-size: 0.875rem;
  }

  .card-content .value {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1e293b;
  }

  .timeline-marker {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
  }

  .timeline-marker.blue {
    background: #2563eb;
  }

  .timeline-marker.purple {
    background: #a855f7;
  }

  .timeline-marker.red {
    background: #dc2626;
  }

  .timeline-marker.amber {
    background: #d97706;
  }

  .timeline-marker.green {
    background: #16a34a;
  }

  .timeline-marker.teal {
    background: #0d9488;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .image-placeholder {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    height: 428px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem;
    overflow: hidden;
  }

  .image-placeholder img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.5rem;
  }

  .info-box {
    padding: 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    margin: 1rem 0;
  }

  .info-box.blue {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
  }

  .info-box.green {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
  }

  .info-box.orange {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #92400e;
  }

  .info-box.red {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .info-box.amber {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #78350f;
  }

  .info-box.teal {
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    color: #134e4a;
  }

  .list-items {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .list-items li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .list-items .icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    margin-top: 0.125rem;
    font-weight: 700;
  }

  .list-items .icon.green {
    background: #dcfce7;
    color: #16a34a;
  }

  .list-items .icon.orange {
    background: #fed7aa;
    color: #d97706;
  }

  .feedback-buttons {
    display: flex;
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .feedback-buttons button {
    flex: 1;
  }

  .star-rating {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .star {
    font-size: 2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #cbd5e1;
  }

  .star:hover,
  .star.active {
    color: #fbbf24;
    transform: scale(1.1);
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #ec4899;
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
  }

  .footer {
    background: #0f172a;
    color: white;
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
  }

  .footer h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .footer p {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .footer-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
  }

  @media (min-width: 640px) {
    .footer-buttons {
      flex-direction: row;
    }
  }

  .footer button {
    background: white;
    color: #0f172a;
  }

  .footer button:hover {
    background: #f1f5f9;
  }

  .footer button.outline {
    background: transparent;
    border: 1px solid white;
    color: white;
  }

  .footer button.outline:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 768px) {
    .hero-content h2 {
      font-size: 1.5rem;
    }

    .hero-content p {
      font-size: 1rem;
    }

    .hero-buttons {
      flex-direction: column;
    }

    .hero-buttons button {
      width: 100%;
      justify-content: center;
    }

    .feedback-buttons {
      flex-direction: column;
    }

    .feedback-buttons button {
      width: 100%;
    }
  }

  .success-message {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
    padding: 0.75rem;
    border-radius: 0.375rem;
    text-align: center;
    font-size: 0.875rem;
    display: none;
    margin-top: 1rem;
  }

  .success-message.show {
    display: block;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: #1e293b;
  }

  .divider {
    border-top: 1px solid #e2e8f0;
    margin: 1rem 0;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .preventive-card {
    border: 1px solid #fde68a;
    border-radius: 0.5rem;
    padding: 1rem;
    background: white;
  }

  .preventive-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .preventive-card h4 {
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .preventive-card p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0.5rem 0;
  }

  .preventive-card .recommendation {
    font-size: 0.875rem;
    font-weight: 600;
    color: #b45309;
  }

  .badge-small {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-orange {
    background: #fed7aa;
    color: #92400e;
    border: 1px solid #fdba74;
  }

  .badge-yellow {
    background: #fef3c7;
    color: #78350f;
    border: 1px solid #fcd34d;
  }

  .badge-blue {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
  }

  .badge-green {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .certificate-box {
    background: linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%);
    border: 2px solid #86efac;
    border-radius: 0.5rem;
    padding: 1.5rem;
    text-align: center;
  }

  .certificate-icon {
    font-size: 4rem;
    color: #16a34a;
    margin-bottom: 1rem;
  }

  .certificate-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #166534;
    margin-bottom: 0.5rem;
  }

  .certificate-subtitle {
    font-size: 0.875rem;
    color: #15803d;
    margin-bottom: 1rem;
  }

  .hash-box {
    background: white;
    border-radius: 0.25rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.75rem;
    color: #64748b;
    font-family: 'Courier New', monospace;
    word-break: break-all;
  }

  .qr-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #15803d;
  }

  .qr-placeholder {
    width: 48px;
    height: 48px;
    background: white;
    border: 2px solid #86efac;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
  }
`;

// Componente Principal
export default function OficinaSync() {
  const [feedback, setFeedback] = useState({
    understood: null,
    rating: null,
    comment: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleUnderstanding = (value) => {
    setFeedback((prev) => ({ ...prev, understood: value }));
  };

  const handleRating = (stars) => {
    setFeedback((prev) => ({ ...prev, rating: stars }));
  };

  const handleCommentChange = (e) => {
    setFeedback((prev) => ({ ...prev, comment: e.target.value }));
  };

  const submitFeedback = () => {
    if (feedback.understood === null || feedback.rating === null) {
      alert("Por favor, responda todas as perguntas obrigatórias");
      return;
    }

    console.log("Feedback enviado:", feedback);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const ratingMessages = {
    5: "Excelente! Muito obrigado!",
    4: "Ótimo! Ficamos felizes!",
    3: "Bom! Sempre melhorando.",
    2: "Podemos melhorar. Nos desculpe.",
    1: "Desculpe-nos. Fale conosco.",
  };

  return (
    <>
      <style>{styles}</style>

      {/* Header */}
      <header>
        <div className="header-container">
          <div className="logo-section">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <h1>Oficina Sync</h1>
              <p>Relatório de Serviço</p>
            </div>
          </div>

          <div className="header-info">
            <div className="info-text">
              <p className="os-number">OS #12847</p>
              <p className="update-time">Atualizado: 19/02/2026 16:42</p>
            </div>
            <div className="badge">✓ Concluído</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="hero">
          <img
            src="https://t3.ftcdn.net/jpg/05/24/89/70/360_F_524897085_NtLPXHm2JJ7DzeY9Hivr0BIDvWgbyK3D.jpg"
            alt="VW Golf 2014 aprovado"
          />
          <div className="hero-overlay">
            <div className="hero-content">
              <h2>Olá, João.</h2>
              <p>Seu VW Golf 1.6 (2014) está pronto.</p>
              <p className="subtitle">
                Continuamos com transparência protegida.
              </p>
              <div className="hero-buttons">
                <button
                  className="btn-primary"
                  onClick={() =>
                    alert("Baixar PDF - Funcionalidade para implementar")
                  }
                >
                  ⬇️ Baixar Relatório (PDF)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    alert("Compartilhar - Funcionalidade para implementar")
                  }
                >
                  📤 Compartilhar
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    alert("WhatsApp - Funcionalidade para implementar")
                  }
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Vehicle Info Cards */}
        <div className="cards-grid">
          <div className="card">
            <div className="card-header blue">
              <h3>Veículo</h3>
            </div>
            <div className="card-content">
              <p className="value">VW Golf 1.6</p>
              <p>Ano: 2014</p>
              <p>Placa: ABC-1D**</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header blue">
              <h3>Quilometragem</h3>
            </div>
            <div className="card-content">
              <p className="value">145.230 km</p>
              <p>Entrada: 145.100 km</p>
              <p>Saída: 145.230 km</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header blue">
              <h3>Status</h3>
            </div>
            <div className="card-content">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ color: "#16a34a", fontWeight: 600 }}>✓</span>
                <span style={{ fontWeight: 600, color: "#16a34a" }}>
                  Aprovado nos testes
                </span>
              </div>
              <p>Sem pendências</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <section>
          <h2 className="section-title">Linha do Tempo do Serviço</h2>

          {/* Etapa 1 */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header blue">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="timeline-marker blue">1</div>
                <div>
                  <h3>Registro de Entrada do Veículo</h3>
                  <p>19/02/2026 às 08:30</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div>
                <h4>Observação do Cliente</h4>
                <div className="info-box blue">
                  "O carro está desligando de vez em quando, principalmente ao
                  parar no semáforo. Também senti um barulho estranho no motor."
                </div>
              </div>

              <div>
                <h4>Fotos de Entrada</h4>
                <div className="grid-4">
                  <div className="image-placeholder">
                    <img
                      src="https://private-us-east-1.manuscdn.com/sessionFile/BJAyP9zeugtbhgm2vuuhVB/sandbox/2KnuOxFWn2VM75b66z8FNx-img-3_1771508539000_na1fn_Y2FyLWluc3BlY3Rpb24tZnJvbnQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvQkpBeVA5emV1Z3RiaGdtMnZ1dWhWQi9zYW5kYm94LzJLbnVPeEZXbjJWTTc1YjY2ejhGTngtaW1nLTNfMTc3MTUwODUzOTAwMF9uYTFmbl9ZMkZ5TFdsdWMzQmxZM1JwYjI0dFpuSnZiblEucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=Zp-Wsua~1lzdwODJrkr2YKcfrpDsk25EODJaVr-tgL6joIMX22N9-QnkEBZIqG5D16Z6KFNFxmcvPO7L7xq5lPlClH2J04KwNkgBS8~LVlqRJ1UzV97-h9E29aMMil53IGv35xGWfagYJbNWgkG4qGAjHoT10K40WekNTvY9yW6gCIOghNSdq4XnFzEcPCAdrQ0VoQC2nbI0kLRTtL-dWKrizlsCvVb4SpKuzBY0ftF8Ize4hdnkEy1CyVKyVgh15Qo4FwrbggUlB2-wrGo3aKYeABn8vqDTqNvLAw-Ur-uHQaiTCqxErSjo8CBaF1DP4JlwnRGczVgmGmOedcFnUQ__"
                      alt="Entrada - Frente"
                    />
                  </div>
                  <div className="image-placeholder">
                    <img
                      src="https://private-us-east-1.manuscdn.com/sessionFile/BJAyP9zeugtbhgm2vuuhVB/sandbox/2KnuOxFWn2VM75b66z8FNx-img-4_1771508537000_na1fn_Y2FyLWluc3BlY3Rpb24tcmVhcg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvQkpBeVA5emV1Z3RiaGdtMnZ1dWhWQi9zYW5kYm94LzJLbnVPeEZXbjJWTTc1YjY2ejhGTngtaW1nLTRfMTc3MTUwODUzNzAwMF9uYTFmbl9ZMkZ5TFdsdWMzQmxZM1JwYjI0dGNtVmhjZy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=EKEiZpwr1cAqXZ9upr9OORhM7jiaWAlCakqd~yo4DpWZRGsoqta6BGF6iKKG4hPiVaLyCPSfB5wAyezV9fbY3wLGafa3cr3xZfadLU7oD-mZv3neA0kZUProJpRx4q4e0M70HS3WMX9YTgL-QA~OzrZgMNHyf~rdk3aUtv2BCut5KzLskQMQiFxuJtJz0Pf6hUIHuCox9spQQw~~j7gqvcHb4ZdrgkgB0~YJn8iMFYOkXCgzFlqJ0P9F~aRt1wBxyGdgwcCEsx4uEezObfyfIudoD~PdfqPPI5yf4SXUqOhno35hpCFcOZfiNx~iIVik95LbG-6EnN~MCTEymIanHw__"
                      alt="Entrada - Traseira"
                    />
                  </div>
                  <div className="image-placeholder">Lateral 1</div>
                  <div className="image-placeholder">Lateral 2</div>
                </div>
              </div>

              <div className="info-box blue">
                <strong>Km de Entrada:</strong> 145.100 km |{" "}
                <strong>Data/Hora:</strong> 19/02/2026 08:30
              </div>
            </div>
          </div>

          {/* Etapa 2 */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header purple">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="timeline-marker purple">2</div>
                <div>
                  <h3>Leitura de Scanner na Chegada</h3>
                  <p>19/02/2026 às 08:45</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="grid-2">
                <div>
                  <h4>Dados Técnicos Iniciais</h4>
                  <div className="info-box blue">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Tensão Bateria:</span>
                      <strong>11.9 V</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>RPM em Marcha Lenta:</span>
                      <strong>850 RPM</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Temperatura do Motor:</span>
                      <strong>92°C</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h4>Informações do Scanner</h4>
                  <div className="info-box blue">
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span>Device ID:</span>
                      <p style={{ fontWeight: 600, margin: 0 }}>
                        OBD-ESP32-044
                      </p>
                    </div>
                    <div>
                      <span>Leitura:</span>
                      <p style={{ fontWeight: 600, margin: 0 }}>
                        19/02/2026 08:45
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider"></div>

              <div>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  ⚠️ Códigos de Falha Detectados (DTCs)
                </h4>
                <div className="info-box orange">
                  <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                    P0300 - Detecção Aleatória de Falha de Ignição
                  </p>
                  <p>
                    <strong>Significado Simples:</strong> O motor está tendo
                    dificuldade para queimar o combustível de forma consistente
                    em alguns cilindros.
                  </p>
                </div>
                <div className="info-box orange">
                  <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                    P0101 - Fluxo de Ar Anômalo no Motor
                  </p>
                  <p>
                    <strong>Significado Simples:</strong> O sensor que mede a
                    quantidade de ar está enviando leituras estranhas.
                  </p>
                </div>
              </div>

              <div>
                <h4>Scanner Diagnóstico</h4>
                <div className="image-placeholder">
                  <img
                    src="https://blog.mixauto.com.br/wp-content/uploads/2017/11/Scanner-automotivo-capa-763x445-1.jpg"
                    alt="Scanner diagnóstico"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Etapa 3 */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header red">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="timeline-marker red">3</div>
                <div>
                  <h3>Diagnóstico e Análise</h3>
                  <p>19/02/2026 às 09:30</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="info-box red">
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  ⚠️ Problema Encontrado
                </h4>
                <p>
                  O carro estava desligando intermitentemente devido a{" "}
                  <strong>falhas de ignição</strong> causadas por problemas no
                  sistema de ar do motor.
                </p>
              </div>

              <div>
                <h4>Causa Provável</h4>
                <div className="info-box blue">
                  O <strong>sensor MAF (Mass Air Flow)</strong> estava sujo e
                  enviando leituras incorretas ao computador do carro. Isso
                  causava uma mistura ar-combustível inadequada, resultando em
                  falhas de ignição e desligamentos.
                </div>
              </div>

              <div>
                <h4>Evidências Fotográficas</h4>
                <div className="grid-2">
                  <div className="image-placeholder">
                    <img
                      src="/workspaces/OficinaSync/components/oficinaSync/sujo.png"
                      alt="Scanner diagnóstico"
                    />
                  </div>
                  <div className="image-placeholder">
                    Comparação Antes/Depois
                  </div>
                </div>
              </div>

              <div>
                <h4>Observações do Técnico</h4>
                <div className="info-box blue">
                  Sensor MAF apresentava acúmulo de resíduos de combustão.
                  Limpeza realizada com sucesso. Recomendação: usar combustível
                  de melhor qualidade para evitar futuro acúmulo.
                </div>
              </div>
            </div>
          </div>

          {/* Etapa 4 */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header amber">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="timeline-marker amber">4</div>
                <div>
                  <h3>Serviço Realizado</h3>
                  <p>19/02/2026 das 09:45 às 11:30</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div>
                <h4>Procedimentos Executados</h4>
                <ul className="list-items">
                  <li>
                    <div className="icon green">✓</div>
                    <span>
                      <strong>Limpeza do Sensor MAF:</strong> Remoção e limpeza
                      profissional com solvente específico
                    </span>
                  </li>
                  <li>
                    <div className="icon green">✓</div>
                    <span>
                      <strong>Inspeção do Filtro de Ar:</strong> Substituição
                      por filtro novo de qualidade OEM
                    </span>
                  </li>
                  <li>
                    <div className="icon green">✓</div>
                    <span>
                      <strong>Limpeza da Válvula EGR:</strong> Remoção de
                      depósitos de carbono
                    </span>
                  </li>
                  <li>
                    <div className="icon green">✓</div>
                    <span>
                      <strong>Teste de Funcionamento:</strong> Motor testado em
                      marcha lenta e aceleração
                    </span>
                  </li>
                </ul>
              </div>

              <div className="divider"></div>

              <div>
                <h4>Peças Utilizadas</h4>
                <div className="info-box blue">
                  <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Filtro de Ar do Motor</strong>
                  </p>
                  <p style={{ margin: 0 }}>Marca: Bosch | Código: 1457433010</p>
                </div>
                <div className="info-box blue">
                  <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Solvente de Limpeza Profissional</strong>
                  </p>
                  <p style={{ margin: 0 }}>Marca: CRC | Código: 05016</p>
                </div>
              </div>

              <div>
                <h4>Fotos do Processo</h4>
                <div className="grid-3">
                  <div className="image-placeholder">Antes do Serviço</div>
                  <div className="image-placeholder">Durante o Serviço</div>
                  <div className="image-placeholder">Após o Serviço</div>
                </div>
              </div>
            </div>
          </div>

          {/* Etapa 5 */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header green">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="timeline-marker green">5</div>
                <div>
                  <h3>Validação Final e Teste de Rua</h3>
                  <p>19/02/2026 das 14:00 às 14:20</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="grid-2">
                <div>
                  <h4>Leitura Final do Scanner</h4>
                  <div className="info-box green">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Códigos de Falha:</span>
                      <strong>Nenhum</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Tensão Bateria:</span>
                      <strong>12.4 V</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>RPM Marcha Lenta:</span>
                      <strong>750 RPM</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Temperatura:</span>
                      <strong>90°C</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h4>Teste de Rua</h4>
                  <div className="info-box green">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>✓</span>
                      <span>
                        <strong>Distância:</strong> 8.4 km
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>✓</span>
                      <span>
                        <strong>Tempo:</strong> 19 minutos
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>✓</span>
                      <span>
                        <strong>Status:</strong> 0 falhas detectadas
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span>✓</span>
                      <span>
                        <strong>Resultado:</strong> Teste com sucesso
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4>Mapa do Teste de Rua</h4>
                <div className="image-placeholder">
                  <img
                    src="https://private-us-east-1.manuscdn.com/sessionFile/BJAyP9zeugtbhgm2vuuhVB/sandbox/2KnuOxFWn2VM75b66z8FNx-img-5_1771508542000_na1fn_dGVzdC1kcml2ZS1tYXA.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvQkpBeVA5emV1Z3RiaGdtMnZ1dWhWQi9zYW5kYm94LzJLbnVPeEZXbjJWTTc1YjY2ejhGTngtaW1nLTVfMTc3MTUwODU0MjAwMF9uYTFmbl9kR1Z6ZEMxa2NtbDJaUzF0WVhBLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=FSOn4sNJyJJbVFeHTBCh4UvF68zWUGO3de2nYEtzNlsi4oQkD0QnwD94mEdZa2xqDW4npA-2uZcdw~vlIH9NX~-7Utvvf2H-SCfbDPYxWUyPv0TIyNym6vbTf6AYWcAcbzafTdZJpwmUs3M3FKm8XFSkQ3dX~7-IUpSxXk6vAzrILs0VLoUweDKeEB2cJFoFDxxuE-8YlTP0qEHnV4uh3upPx9F9-CQa5gUQeB~R6Mp03aePcB3rFXq67PsQrr6eMdjsQ9A~3SLphuXJuJRqwEYNrD7q2gFScQURZtIFPoVSKolKsp66o8rgyIQCJf68CoSUz2JJoErLOptp4~2bXQ__"
                    alt="Mapa do teste de rua"
                  />
                </div>
              </div>

              <div className="info-box green">
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  ✓ Checklist de Validação
                </h4>
                <ul className="list-items">
                  <li>
                    <div className="icon green">✓</div> Motor ligando sem
                    dificuldade
                  </li>
                  <li>
                    <div className="icon green">✓</div> Marcha lenta estável
                  </li>
                  <li>
                    <div className="icon green">✓</div> Aceleração suave e
                    responsiva
                  </li>
                  <li>
                    <div className="icon green">✓</div> Sem ruídos anormais
                  </li>
                  <li>
                    <div className="icon green">✓</div> Nenhuma luz de aviso no
                    painel
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Etapa 6 */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header teal">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="timeline-marker teal">6</div>
                <div>
                  <h3>Registro de Saída do Veículo</h3>
                  <p>19/02/2026 às 16:42</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="info-box teal">
                <strong>Km de Saída:</strong> 145.230 km |{" "}
                <strong>Data/Hora:</strong> 19/02/2026 16:42
              </div>

              <div>
                <h4>Fotos de Saída</h4>
                <div className="grid-2">
                  <div className="image-placeholder">Saída - Frente</div>
                  <div className="image-placeholder">Saída - Traseira</div>
                </div>
              </div>

              <div className="info-box teal">
                <p>
                  <strong>Observação Final:</strong> Veículo entregue em
                  perfeitas condições. Todos os testes realizados com sucesso.
                  Recomenda-se manutenção preventiva a cada 10.000 km.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Observações Preventivas */}
        <section>
          <h2
            className="section-title"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            ⚠️ Observações Preventivas
          </h2>

          <div className="grid-2">
            <div className="preventive-card">
              <div className="preventive-card-header">
                <h4>Pastilhas de Freio com Desgaste</h4>
                <span className="badge-small badge-orange">Acompanhar</span>
              </div>
              <p>
                As pastilhas dianteiras estão com aproximadamente 40% de vida
                útil restante.
              </p>
              <p className="recommendation">
                Recomendação: Revisar em 15.000 km ou em 6 meses
              </p>
            </div>

            <div className="preventive-card">
              <div className="preventive-card-header">
                <h4>Óleo do Motor</h4>
                <span className="badge-small badge-yellow">Preventivo</span>
              </div>
              <p>
                Próxima troca de óleo recomendada conforme manual do fabricante.
              </p>
              <p className="recommendation">
                Recomendação: Próxima troca em 10.000 km
              </p>
            </div>

            <div className="preventive-card">
              <div className="preventive-card-header">
                <h4>Bateria do Veículo</h4>
                <span className="badge-small badge-blue">Informativo</span>
              </div>
              <p>
                Bateria em bom estado, mas com 3 anos de uso. Considere
                substituição preventiva.
              </p>
              <p className="recommendation">
                Recomendação: Avaliação em 6 meses
              </p>
            </div>

            <div className="preventive-card">
              <div className="preventive-card-header">
                <h4>Filtro de Ar Condicionado</h4>
                <span className="badge-small badge-green">Bom Estado</span>
              </div>
              <p>
                Filtro em bom estado, sem necessidade de substituição imediata.
              </p>
              <p className="recommendation">
                Recomendação: Próxima verificação em 20.000 km
              </p>
            </div>
          </div>
        </section>

        {/* Garantia e Certificado */}
        <div className="grid-2">
          <div className="card">
            <div className="card-header indigo">
              <h3
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                📄 Garantia do Serviço
              </h3>
            </div>
            <div className="card-content">
              <div>
                <h4>Prazo de Garantia</h4>
                <p className="value" style={{ color: "#4f46e5" }}>
                  90 dias
                </p>
                <p>A partir da data de conclusão do serviço</p>
              </div>

              <div className="divider"></div>

              <div>
                <h4>O que cobre:</h4>
                <ul className="list-items">
                  <li>
                    <div className="icon green">✓</div> Defeitos de mão de obra
                  </li>
                  <li>
                    <div className="icon green">✓</div> Peças instaladas (exceto
                    desgaste natural)
                  </li>
                  <li>
                    <div className="icon green">✓</div> Falhas relacionadas ao
                    serviço realizado
                  </li>
                </ul>
              </div>

              <div className="divider"></div>

              <div>
                <h4>O que não cobre:</h4>
                <ul className="list-items">
                  <li>
                    <div className="icon orange">!</div> Desgaste natural de
                    peças
                  </li>
                  <li>
                    <div className="icon orange">!</div> Acidentes ou mau uso
                  </li>
                  <li>
                    <div className="icon orange">!</div> Modificações não
                    autorizadas
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header green">
              <h3
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                ✓ Certificado Digital
              </h3>
            </div>
            <div className="card-content">
              <div className="certificate-box">
                <div className="certificate-icon">✓</div>
                <h3 className="certificate-title">Certificado de Serviço</h3>
                <p className="certificate-subtitle">
                  VW Golf 1.6 - 2014
                  <br />
                  Placa: ABC-1D**
                </p>
                <div className="hash-box">
                  Hash: 3FA9B2E4C7D1E8F2A4B5C6D7E8F9A0B1
                </div>
                <button
                  className="btn-primary"
                  style={{ width: "100%", marginBottom: "1rem" }}
                  onClick={() =>
                    alert(
                      "Baixar Certificado - Funcionalidade para implementar",
                    )
                  }
                >
                  ⬇️ Baixar Certificado (PDF)
                </button>
                <div className="qr-box">
                  <div className="qr-placeholder">QR</div>
                  <span>Código QR para verificação</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="card">
          <div className="card-header pink">
            <h3
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              ⭐ Sua Avaliação
            </h3>
            <p>Ajude-nos a melhorar com seu feedback</p>
          </div>
          <div className="card-content">
            <div>
              <h4>Você entendeu o que foi feito?</h4>
              <div className="feedback-buttons">
                <button
                  className="btn-primary"
                  onClick={() => handleUnderstanding(true)}
                  style={{ opacity: feedback.understood === true ? 1 : 0.6 }}
                >
                  Sim, entendi
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleUnderstanding(false)}
                  style={{ opacity: feedback.understood === false ? 1 : 0.6 }}
                >
                  Não, ficou confuso
                </button>
              </div>
            </div>

            <div>
              <h4>Como foi sua experiência?</h4>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${feedback.rating && feedback.rating >= star ? "active" : ""}`}
                    onClick={() => handleRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
              {feedback.rating && (
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#64748b",
                    marginTop: "0.5rem",
                  }}
                >
                  {ratingMessages[feedback.rating]}
                </p>
              )}
            </div>

            <div>
              <h4>Deixe um comentário (opcional)</h4>
              <textarea
                value={feedback.comment}
                onChange={handleCommentChange}
                placeholder="Seu feedback é importante para nós..."
              />
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={submitFeedback}
            >
              Enviar Avaliação
            </button>
            {showSuccess && (
              <div className="success-message show">
                ✓ Obrigado! Sua avaliação foi enviada com sucesso.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <h3>Dúvidas ou Problemas?</h3>
          <p>Estamos aqui para ajudar!</p>
          <div className="footer-buttons">
            <button
              className="btn-primary"
              onClick={() =>
                alert("Falar com a Oficina - Funcionalidade para implementar")
              }
            >
              💬 Falar com a Oficina
            </button>
            <button
              className="btn-primary outline"
              onClick={() =>
                alert("Localização - Funcionalidade para implementar")
              }
            >
              📍 Localização
            </button>
            <button
              className="btn-primary outline"
              onClick={() =>
                alert(
                  "Horário de Atendimento - Funcionalidade para implementar",
                )
              }
            >
              🕐 Horário de Atendimento
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
