import { useEffect, useState } from "react";
import { getQuota, type QuotaInfo } from "../api";

interface Props {
  onNavigate: (tab: "overview" | "upload" | "analysis" | "webhook" | "history") => void;
}

export function OverviewTab({ onNavigate }: Props) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getQuota().then(setQuota).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      {/* Intro */}
      <div className="card">
        <h2>Bienvenido a la API de Vistony</h2>
        <p className="desc">
          Esta plataforma permite analizar material publicitario usando
          inteligencia artificial. Sube una imagen de material POP, posters,
          estanterias o toldos y recibe un analisis detallado con puntuacion,
          clasificacion y recomendaciones.
        </p>

        <div className="flow">
          <div className="flow-step">Subir imagen</div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step">Enviar a analisis</div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step">Clasificacion IA</div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step">Analisis detallado</div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step">Resultados</div>
        </div>
      </div>

      {/* Quota */}
      <div className="card">
        <h2>Tu Cuota de Analisis</h2>
        <p className="desc">
          Cada API key tiene un limite de analisis. Aqui puedes ver tu consumo
          actual.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {quota && (
          <div className="result-grid">
            <div className="result-item">
              <div className="label">Usados</div>
              <div className="value">{quota.used}</div>
            </div>
            <div className="result-item">
              <div className="label">Restantes</div>
              <div className="value">
                {quota.is_unlimited ? "Ilimitado" : quota.remaining}
              </div>
            </div>
            <div className="result-item">
              <div className="label">Maximo</div>
              <div className="value">
                {quota.is_unlimited ? "Ilimitado" : quota.max}
              </div>
            </div>
            <div className="result-item">
              <div className="label">Estado</div>
              <div className="value" style={{ color: "var(--success)" }}>
                Activo
              </div>
            </div>
          </div>
        )}
        {!quota && !error && (
          <p style={{ color: "var(--text-muted)" }}>
            <span className="spinner" /> Cargando cuota...
          </p>
        )}
      </div>

      {/* API Reference */}
      <div className="card">
        <h2>Endpoints Principales</h2>
        <p className="desc">
          Referencia rapida de los endpoints disponibles para integracion.
        </p>
        <table>
          <thead>
            <tr>
              <th>Metodo</th>
              <th>Endpoint</th>
              <th>Descripcion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST</code>
              </td>
              <td>
                <code>/s3/upload</code>
              </td>
              <td>Obtener URL presignada para subida</td>
            </tr>
            <tr>
              <td>
                <code>POST</code>
              </td>
              <td>
                <code>/s3/files/:id/confirm</code>
              </td>
              <td>Confirmar que el archivo se subio</td>
            </tr>
            <tr>
              <td>
                <code>POST</code>
              </td>
              <td>
                <code>/api/v1/analyze</code>
              </td>
              <td>Enviar imagen para analisis</td>
            </tr>
            <tr>
              <td>
                <code>GET</code>
              </td>
              <td>
                <code>/api/v1/analyze/:jobId</code>
              </td>
              <td>Consultar estado del analisis (polling)</td>
            </tr>
            <tr>
              <td>
                <code>GET</code>
              </td>
              <td>
                <code>/api/v1/analyze</code>
              </td>
              <td>Listar historial de analisis</td>
            </tr>
            <tr>
              <td>
                <code>POST</code>
              </td>
              <td>
                <code>/api/v1/analyze/:jobId/retry</code>
              </td>
              <td>Reintentar analisis fallido</td>
            </tr>
            <tr>
              <td>
                <code>GET</code>
              </td>
              <td>
                <code>/api/v1/quota</code>
              </td>
              <td>Consultar cuota restante</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Auth */}
      <div className="card">
        <h2>Autenticacion</h2>
        <p className="desc">
          La API soporta dos metodos de autenticacion. Esta demo usa API Key.
        </p>
        <div className="code-block">
          <pre>{`// Metodo 1: API Key (usado en esta demo)
fetch("https://api-vistony.metrica.software/api/v1/analyze", {
  method: "POST",
  headers: {
    "X-API-Key": "vst_tu_api_key_aqui",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ image_url: "https://..." })
})

// Metodo 2: JWT Bearer Token
fetch("https://api-vistony.metrica.software/api/v1/analyze", {
  headers: {
    "Authorization": "Bearer eyJhbG...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ image_url: "https://..." })
})`}</pre>
        </div>
      </div>

      {/* Quick start */}
      <div className="card">
        <h2>Inicio Rapido</h2>
        <p className="desc">
          Sigue estos pasos para realizar tu primer analisis.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
          >
            <div className="step-badge">
              <span className="num">1</span>
            </div>
            <div>
              <strong>Sube una imagen</strong>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Obtiene una URL presignada, sube el archivo a S3 y confirma la
                subida.
              </p>
            </div>
          </div>
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
          >
            <div className="step-badge">
              <span className="num">2</span>
            </div>
            <div>
              <strong>Envia a analisis</strong>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Envias la URL de la imagen al endpoint de analisis. Recibiras un{" "}
                <code>jobId</code>.
              </p>
            </div>
          </div>
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
          >
            <div className="step-badge">
              <span className="num">3</span>
            </div>
            <div>
              <strong>Obtiene resultados</strong>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Usa <strong>polling</strong> (consultas periodicas) o{" "}
                <strong>webhook</strong> (notificacion push) para obtener los
                resultados.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <button
            className="btn btn-primary"
            onClick={() => onNavigate("upload")}
          >
            Comenzar &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
