import { useCallback, useEffect, useRef, useState } from "react";
import {
  submitAnalysis,
  getAnalysisStatus,
  type AnalysisResult,
} from "../api";

type LogEntry = {
  time: string;
  msg: string;
  type: "info" | "success" | "error";
};

interface Props {
  prefilledUrl: string;
}

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

function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--error)";
}

export function AnalysisTab({ prefilledUrl }: Props) {
  const [imageUrl, setImageUrl] = useState(prefilledUrl);
  const [mode, setMode] = useState<"polling" | "webhook">("polling");
  const [webhookUrl, setWebhookUrl] = useState("http://localhost:3001/webhook");
  const [forceType, setForceType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showJson, setShowJson] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setImageUrl(prefilledUrl);
  }, [prefilledUrl]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const log = (msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), msg, type },
    ]);
  };

  const handleSubmit = useCallback(async () => {
    if (!imageUrl) return;
    setSubmitting(true);
    setResult(null);
    setLogs([]);

    try {
      log(`Enviando imagen para analisis...`);
      log(`URL: ${imageUrl}`);
      log(`Modo: ${mode === "polling" ? "Polling (consulta periodica)" : "Webhook (notificacion push)"}`);

      const params: Parameters<typeof submitAnalysis>[0] = {
        image_url: imageUrl,
        async: true,
      };

      if (mode === "webhook") {
        params.webhook_url = webhookUrl;
        log(`Webhook URL: ${webhookUrl}`);
      }

      if (forceType) {
        params.force_type = forceType;
        log(`Tipo forzado: ${CATEGORY_LABELS[forceType] || forceType}`);
      }

      const job = await submitAnalysis(params);
      log(`Job creado: ${job.id}`, "success");
      log(`Estado inicial: ${STATUS_LABELS[job.status] || job.status}`);

      if (mode === "polling") {
        // Start polling
        setPolling(true);
        log("Iniciando polling cada 3 segundos...");
        let pollCount = 0;

        pollRef.current = setInterval(async () => {
          pollCount++;
          try {
            const status = await getAnalysisStatus(job.id);
            log(
              `[Poll #${pollCount}] Estado: ${STATUS_LABELS[status.status] || status.status}`
            );

            if (
              status.status === "completed" ||
              status.status === "failed"
            ) {
              if (pollRef.current) clearInterval(pollRef.current);
              setPolling(false);
              setResult(status);

              if (status.status === "completed") {
                log(
                  `Analisis completado en ${status.processing_time_ms}ms`,
                  "success"
                );
                if (status.classification) {
                  log(
                    `Clasificacion: ${CATEGORY_LABELS[status.classification.category] || status.classification.category} (${(status.classification.confidence * 100).toFixed(1)}%)`,
                    "success"
                  );
                }
                if (status.analysis) {
                  log(
                    `Puntuacion: ${status.analysis.score}/100`,
                    "success"
                  );
                }
              } else {
                log(
                  `Error: ${status.error?.message || "Error desconocido"}`,
                  "error"
                );
              }
            }
          } catch (err: any) {
            log(`Error de polling: ${err.message}`, "error");
          }
        }, 3000);
      } else {
        log(
          "Esperando notificacion via webhook. Revisa la pestana 'Webhooks' para ver los eventos recibidos.",
          "info"
        );
        // Also do a delayed check
        setTimeout(async () => {
          try {
            const status = await getAnalysisStatus(job.id);
            if (status.status === "completed" || status.status === "failed") {
              setResult(status);
              log(
                `Estado final obtenido: ${STATUS_LABELS[status.status]}`,
                status.status === "completed" ? "success" : "error"
              );
            }
          } catch {
            // ignore
          }
        }, 15000);
      }
    } catch (err: any) {
      log(`Error: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }, [imageUrl, mode, webhookUrl, forceType]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
    log("Polling detenido manualmente", "info");
  };

  return (
    <>
      {/* Explanation */}
      <div className="card">
        <div className="step-badge">
          <span className="num">2</span> Analizar Imagen
        </div>
        <h2>Enviar Imagen para Analisis</h2>
        <p className="desc">
          Una vez que tienes la URL publica de la imagen, enviarla al endpoint de
          analisis. La API clasificara automaticamente el tipo de material y
          realizara un analisis detallado con puntuacion.
        </p>

        <div className="inner-tabs">
          <button
            className={mode === "polling" ? "active" : ""}
            onClick={() => setMode("polling")}
          >
            Modo Polling
          </button>
          <button
            className={mode === "webhook" ? "active" : ""}
            onClick={() => setMode("webhook")}
          >
            Modo Webhook
          </button>
        </div>

        {mode === "polling" ? (
          <>
            <div className="alert alert-info">
              <strong>Polling:</strong> Despues de enviar el analisis, consultaras
              periodicamente el estado del job hasta que se complete. Simple de
              implementar, ideal para scripts y pruebas.
            </div>
            <div className="code-block">
              <pre>{`// Enviar analisis
const job = await fetch("/api/v1/analyze", {
  method: "POST",
  headers: { "X-API-Key": "vst_...", "Content-Type": "application/json" },
  body: JSON.stringify({ image_url: "https://...", async: true })
});
const { id } = await job.json(); // { id: "uuid", status: "pending" }

// Polling cada 3 segundos
const poll = setInterval(async () => {
  const res = await fetch(\`/api/v1/analyze/\${id}\`, {
    headers: { "X-API-Key": "vst_..." }
  });
  const result = await res.json();

  if (result.status === "completed" || result.status === "failed") {
    clearInterval(poll);
    console.log("Resultado:", result);
  }
}, 3000);`}</pre>
            </div>
          </>
        ) : (
          <>
            <div className="alert alert-info">
              <strong>Webhook:</strong> En lugar de consultar periodicamente,
              proporcionas una URL y el servidor te enviara el resultado cuando
              este listo. Mas eficiente para produccion.
            </div>
            <div className="code-block">
              <pre>{`// Enviar analisis con webhook
const job = await fetch("/api/v1/analyze", {
  method: "POST",
  headers: { "X-API-Key": "vst_...", "Content-Type": "application/json" },
  body: JSON.stringify({
    image_url: "https://...",
    async: true,
    webhook_url: "https://tu-servidor.com/webhook"
  })
});

// Tu servidor recibira un POST con el resultado:
// Headers: X-Webhook-Signature: sha256=...
// Body: { id, status, classification, analysis, ... }`}</pre>
            </div>
          </>
        )}
      </div>

      {/* Submit form */}
      <div className="card">
        <h3>Probar Analisis</h3>

        <div className="form-row">
          <label>URL de la imagen (HTTPS)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
          />
        </div>

        {mode === "webhook" && (
          <div className="form-row">
            <label>URL del webhook</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://tu-servidor.com/webhook"
            />
            <small style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
              Nota: La API requiere HTTPS para webhooks. Esta demo usa el backend
              local como receptor.
            </small>
          </div>
        )}

        <div className="form-row">
          <label>Forzar tipo de material (opcional)</label>
          <select value={forceType} onChange={(e) => setForceType(e.target.value)}>
            <option value="">Deteccion automatica</option>
            <option value="exterior_pos">POP Exterior</option>
            <option value="poster">Poster / Afiche</option>
            <option value="shelf">Estanteria</option>
            <option value="canopy">Toldo / Canopy</option>
          </select>
        </div>

        <div className="btn-row">
          <button
            className="btn btn-primary"
            disabled={!imageUrl || submitting || polling}
            onClick={handleSubmit}
          >
            {submitting && <span className="spinner" />}
            {submitting ? "Enviando..." : "Analizar Imagen"}
          </button>
          {polling && (
            <button className="btn btn-outline" onClick={stopPolling}>
              Detener Polling
            </button>
          )}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="log">
            {logs.map((l, i) => (
              <div className="log-entry" key={i}>
                <span className="log-time">{l.time}</span>
                <span className={`log-msg ${l.type}`}>{l.msg}</span>
              </div>
            ))}
            {polling && (
              <div className="log-entry">
                <span className="log-time">
                  <span
                    className="pulse-dot"
                    style={{ background: "var(--info)" }}
                  />
                </span>
                <span className="log-msg info">Esperando resultado...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {result && result.status === "completed" && (
        <div className="card">
          <h3>Resultado del Analisis</h3>

          <div className="btn-row mb-2">
            <span
              className={`badge badge-${result.status}`}
            >
              {STATUS_LABELS[result.status]}
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? "Ver Resumen" : "Ver JSON Crudo"}
            </button>
          </div>

          {showJson ? (
            <div className="json-viewer">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="result-grid">
                {result.classification && (
                  <>
                    <div className="result-item">
                      <div className="label">Clasificacion</div>
                      <div className="value">
                        {CATEGORY_LABELS[result.classification.category] ||
                          result.classification.category}
                      </div>
                    </div>
                    <div className="result-item">
                      <div className="label">Confianza</div>
                      <div className="value">
                        {(result.classification.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </>
                )}
                {result.analysis && (
                  <>
                    <div className="result-item">
                      <div className="label">Puntuacion General</div>
                      <div
                        className="value"
                        style={{ color: scoreColor(result.analysis.score) }}
                      >
                        {result.analysis.score}/100
                      </div>
                      <div className="score-bar">
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${result.analysis.score}%`,
                            background: scoreColor(result.analysis.score),
                          }}
                        />
                      </div>
                    </div>
                    <div className="result-item">
                      <div className="label">Tiempo de Procesamiento</div>
                      <div className="value">
                        {result.processing_time_ms
                          ? `${(result.processing_time_ms / 1000).toFixed(1)}s`
                          : "N/A"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Classification reasoning */}
              {result.classification?.reasoning && (
                <div className="mt-2">
                  <h3>Razonamiento de Clasificacion</h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {result.classification.reasoning}
                  </p>
                </div>
              )}

              {/* Alternatives */}
              {result.classification?.alternatives &&
                result.classification.alternatives.length > 0 && (
                  <div className="mt-2">
                    <h3>Alternativas de Clasificacion</h3>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {result.classification.alternatives.map((alt, i) => (
                        <span key={i} className="badge badge-analyzing">
                          {CATEGORY_LABELS[alt.category] || alt.category}{" "}
                          {(alt.confidence * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Feedback */}
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

              {/* Criteria scores */}
              {result.analysis?.criteria_scores &&
                result.analysis.criteria_scores.length > 0 && (
                  <div className="mt-2">
                    <h3>Desglose por Criterio</h3>
                    {result.analysis.criteria_scores.map((cs, i) => (
                      <div className="criteria-item" key={i}>
                        <div className="criteria-header">
                          <span className="criteria-name">
                            {cs.criterion_name}
                          </span>
                          <span
                            className="criteria-score"
                            style={{ color: scoreColor(cs.score) }}
                          >
                            {cs.score}/100 (peso: {cs.weight})
                          </span>
                        </div>
                        <div className="score-bar">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${cs.score}%`,
                              background: scoreColor(cs.score),
                            }}
                          />
                        </div>
                        <div className="criteria-assessment">
                          {cs.assessment}
                        </div>
                        {cs.strengths && cs.strengths.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              marginTop: "0.25rem",
                              color: "var(--success)",
                            }}
                          >
                            Fortalezas: {cs.strengths.join(", ")}
                          </div>
                        )}
                        {cs.weaknesses && cs.weaknesses.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              marginTop: "0.125rem",
                              color: "var(--error)",
                            }}
                          >
                            Debilidades: {cs.weaknesses.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {/* Recommendations */}
              {result.analysis?.recommendations &&
                result.analysis.recommendations.length > 0 && (
                  <div className="mt-2">
                    <h3>Recomendaciones</h3>
                    <ul
                      style={{
                        paddingLeft: "1.25rem",
                        marginTop: "0.5rem",
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {result.analysis.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: "0.25rem" }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          )}
        </div>
      )}

      {/* Error result */}
      {result && result.status === "failed" && (
        <div className="card">
          <h3>Error en el Analisis</h3>
          <div className="alert alert-error">
            <strong>{result.error?.code || "ERROR"}:</strong>{" "}
            {result.error?.message || "Error desconocido"}
          </div>
          <div className="json-viewer">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </>
  );
}
