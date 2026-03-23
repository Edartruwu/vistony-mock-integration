import { useCallback, useState } from "react";
import { getAnalysisStatus, type AnalysisResult } from "../api";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  classifying: "Clasificando",
  analyzing: "Analizando",
  completed: "Completado",
  failed: "Fallido",
};

const CATEGORY_LABELS: Record<string, string> = {
  exterior_pos: "POP Exterior",
  poster: "Poster / Afiche",
  shelf: "Estanteria",
  canopy: "Toldo / Canopy",
};

export function HistoryTab() {
  const [jobId, setJobId] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = useCallback(async () => {
    if (!jobId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await getAnalysisStatus(jobId.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return (
    <>
      <div className="card">
        <h2>Consultar Analisis</h2>
        <p className="desc">
          Ingresa el ID del job para consultar su estado y resultados. Esto es
          equivalente a hacer <code>GET /api/v1/analyze/:jobId</code>.
        </p>

        <div className="form-row">
          <label>Job ID (UUID)</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="ej: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
            <button
              className="btn btn-primary"
              disabled={!jobId.trim() || loading}
              onClick={lookup}
              style={{ whiteSpace: "nowrap" }}
            >
              {loading && <span className="spinner" />}
              Consultar
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="code-block">
          <pre>{`// Consultar estado de un analisis
const response = await fetch(\`/api/v1/analyze/\${jobId}\`, {
  headers: { "X-API-Key": "vst_..." }
});
const result = await response.json();

// Posibles estados:
// "pending"     -> En cola
// "classifying" -> Clasificando tipo de material
// "analyzing"   -> Analizando calidad
// "completed"   -> Finalizado con resultados
// "failed"      -> Error (ver result.error)`}</pre>
        </div>
      </div>

      {result && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Resultado</h3>
            <span className={`badge badge-${result.status}`}>
              {STATUS_LABELS[result.status] || result.status}
            </span>
          </div>

          <div className="result-grid">
            <div className="result-item">
              <div className="label">ID</div>
              <div className="value" style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                {result.id}
              </div>
            </div>
            <div className="result-item">
              <div className="label">Estado</div>
              <div className="value">{STATUS_LABELS[result.status] || result.status}</div>
            </div>
            {result.classification && (
              <>
                <div className="result-item">
                  <div className="label">Clasificacion</div>
                  <div className="value">
                    {CATEGORY_LABELS[result.classification.category] || result.classification.category}
                  </div>
                </div>
                <div className="result-item">
                  <div className="label">Confianza</div>
                  <div className="value">{(result.classification.confidence * 100).toFixed(1)}%</div>
                </div>
              </>
            )}
            {result.analysis && (
              <>
                <div className="result-item">
                  <div className="label">Puntuacion</div>
                  <div className="value">{result.analysis.score}/100</div>
                </div>
                <div className="result-item">
                  <div className="label">Marca Detectada</div>
                  <div className="value">{result.analysis.brand_detected ? "Si" : "No"}</div>
                </div>
              </>
            )}
            {result.processing_time_ms && (
              <div className="result-item">
                <div className="label">Tiempo</div>
                <div className="value">{(result.processing_time_ms / 1000).toFixed(1)}s</div>
              </div>
            )}
            <div className="result-item">
              <div className="label">Creado</div>
              <div className="value" style={{ fontSize: "0.85rem" }}>
                {new Date(result.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          {result.analysis?.feedback && (
            <div className="mt-2">
              <h3>Retroalimentacion</h3>
              <div
                style={{
                  background: "var(--bg-input)",
                  borderRadius: "var(--radius)",
                  padding: "1rem",
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {result.analysis.feedback}
              </div>
            </div>
          )}

          {result.error && (
            <div className="alert alert-error mt-2">
              <strong>{result.error.code}:</strong> {result.error.message}
            </div>
          )}

          <div className="mt-2">
            <h3>Respuesta Completa (JSON)</h3>
            <div className="json-viewer">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
