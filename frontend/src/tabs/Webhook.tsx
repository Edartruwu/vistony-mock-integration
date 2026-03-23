import { useCallback, useEffect, useState } from "react";
import {
  getWebhookEvents,
  clearWebhookEvents,
  type WebhookEvent,
} from "../api";

export function WebhookTab() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selected, setSelected] = useState<WebhookEvent | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { events } = await getWebhookEvents();
      setEvents(events);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const handleClear = async () => {
    await clearWebhookEvents();
    setEvents([]);
    setSelected(null);
  };

  return (
    <>
      {/* Explanation */}
      <div className="card">
        <div className="step-badge">
          <span className="num">3</span> Webhooks
        </div>
        <h2>Recibir Resultados via Webhook</h2>
        <p className="desc">
          Los webhooks permiten recibir notificaciones push cuando un analisis se
          completa, sin necesidad de hacer polling. El servidor envia un POST a tu
          URL con el resultado completo.
        </p>

        <div className="alert alert-info">
          <strong>Firma de seguridad:</strong> Cada entrega incluye un header{" "}
          <code>X-Webhook-Signature</code> con una firma HMAC-SHA256 que puedes
          verificar para asegurar que el mensaje es autentico.
        </div>

        <h3>Configuracion del Webhook</h3>
        <div className="code-block">
          <pre>{`// Al enviar el analisis, incluye webhook_url:
const job = await fetch("/api/v1/analyze", {
  method: "POST",
  headers: { "X-API-Key": "vst_...", "Content-Type": "application/json" },
  body: JSON.stringify({
    image_url: "https://...",
    async: true,
    webhook_url: "https://tu-servidor.com/webhook"
  })
});`}</pre>
        </div>

        <h3 className="mt-2">Servidor para Recibir Webhooks</h3>
        <div className="code-block">
          <pre>{`import { Hono } from "hono";
import { createHmac } from "crypto";

const app = new Hono();

const WEBHOOK_SECRET = "tu_secreto";

app.post("/webhook", async (c) => {
  // 1. Verificar firma
  const signature = c.req.header("X-Webhook-Signature");
  const body = await c.req.text();

  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return c.json({ error: "Firma invalida" }, 401);
  }

  // 2. Procesar resultado
  const payload = JSON.parse(body);
  console.log("Analisis completado:", payload.id);
  console.log("Puntuacion:", payload.analysis?.score);
  console.log("Clasificacion:", payload.classification?.category);

  // 3. Responder 200 para confirmar recepcion
  return c.json({ received: true });
});`}</pre>
        </div>

        <h3 className="mt-2">Politica de Reintentos</h3>
        <p className="desc">
          Si tu servidor no responde con un 2xx, el sistema reintentara con
          backoff exponencial:
        </p>
        <table>
          <thead>
            <tr>
              <th>Intento</th>
              <th>Espera</th>
              <th>Tiempo acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Inmediato</td>
              <td>0s</td>
            </tr>
            <tr>
              <td>2</td>
              <td>1 segundo</td>
              <td>1s</td>
            </tr>
            <tr>
              <td>3</td>
              <td>1 minuto</td>
              <td>~1m</td>
            </tr>
            <tr>
              <td>4</td>
              <td>5 minutos</td>
              <td>~6m</td>
            </tr>
            <tr>
              <td>5</td>
              <td>30 minutos</td>
              <td>~36m</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Live webhook events */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Eventos Recibidos{" "}
            {autoRefresh && (
              <span
                className="pulse-dot"
                style={{
                  background: "var(--success)",
                  marginLeft: "0.5rem",
                  verticalAlign: "middle",
                }}
              />
            )}
          </h3>
          <div className="btn-row">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Pausar" : "Reanudar"}
            </button>
            <button className="btn btn-sm btn-outline" onClick={refresh}>
              Refrescar
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleClear}>
              Limpiar
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--text-muted)",
            }}
          >
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>&#128233;</p>
            <p>No hay eventos de webhook aun.</p>
            <p style={{ fontSize: "0.8rem" }}>
              Envia un analisis con webhook_url para ver los eventos aqui.
            </p>
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="webhook-event"
              style={{ cursor: "pointer" }}
              onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="event-job">Job: {ev.jobId}</div>
                <div className="event-time">
                  {new Date(ev.receivedAt).toLocaleTimeString()}
                </div>
              </div>
              {selected?.id === ev.id && (
                <div className="json-viewer" style={{ marginTop: "0.5rem" }}>
                  <pre>{JSON.stringify(ev.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
