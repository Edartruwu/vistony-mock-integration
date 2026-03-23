import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

const VISTONY_API = "https://api-vistony.metrica.software";
const API_KEY = "vst_e91ce2a5cefe42908ab1253ef901c5b7e7cd6d597932324f0b039db3843a04db";

// In-memory webhook event store
interface WebhookEvent {
  id: string;
  jobId: string;
  payload: unknown;
  receivedAt: string;
}
const webhookEvents: WebhookEvent[] = [];

app.use("/*", cors({ origin: "*" }));

// Health check
app.get("/", (c) => c.json({ status: "ok", webhookEvents: webhookEvents.length }));

// ─── Proxy helpers ───────────────────────────────────────────────────────────

async function proxyGet(path: string) {
  const res = await fetch(`${VISTONY_API}${path}`, {
    headers: { "X-API-Key": API_KEY },
  });
  const data = await res.json();
  return { data, status: res.status };
}

async function proxyPost(path: string, body?: unknown) {
  const res = await fetch(`${VISTONY_API}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { data, status: res.status };
}

// ─── S3 Upload Flow ──────────────────────────────────────────────────────────

// Step 1: Request presigned upload URL
app.post("/api/upload", async (c) => {
  const body = await c.req.json();
  const { data, status } = await proxyPost("/s3/upload", body);
  return c.json(data, status as any);
});

// Step 2: Confirm upload
app.post("/api/upload/:id/confirm", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { data, status } = await proxyPost(`/s3/files/${id}/confirm`, body);
  return c.json(data, status as any);
});

// Get file info
app.get("/api/files/:id", async (c) => {
  const id = c.req.param("id");
  const { data, status } = await proxyGet(`/s3/files/${id}`);
  return c.json(data, status as any);
});

// ─── Analysis Flow ───────────────────────────────────────────────────────────

// Submit analysis
app.post("/api/analyze", async (c) => {
  const body = await c.req.json();
  const { data, status } = await proxyPost("/api/v1/analyze", body);
  // Normalize: the real API returns job_id, but the frontend expects id
  if (data && data.job_id && !data.id) {
    data.id = data.job_id;
  }
  return c.json(data, status as any);
});

// Poll analysis status
app.get("/api/analyze/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const { data, status } = await proxyGet(`/api/v1/analyze/${jobId}`);
  // Normalize: the real API returns job_id, but the frontend expects id
  if (data && data.job_id && !data.id) {
    data.id = data.job_id;
  }
  return c.json(data, status as any);
});

// List analyses
app.get("/api/analyses", async (c) => {
  const query = c.req.query();
  const params = new URLSearchParams(query);
  const { data, status } = await proxyGet(`/api/v1/analyze?${params.toString()}`);
  return c.json(data, status as any);
});

// Retry analysis
app.post("/api/analyze/:jobId/retry", async (c) => {
  const jobId = c.req.param("jobId");
  const { data, status } = await proxyPost(`/api/v1/analyze/${jobId}/retry`);
  // Normalize: the real API returns job_id, but the frontend expects id
  if (data && data.job_id && !data.id) {
    data.id = data.job_id;
  }
  return c.json(data, status as any);
});

// Get quota
app.get("/api/quota", async (c) => {
  const { data, status } = await proxyGet("/api/v1/quota");
  return c.json(data, status as any);
});

// ─── Webhook Receiver ────────────────────────────────────────────────────────

app.post("/webhook", async (c) => {
  const signature = c.req.header("X-Webhook-Signature");
  const payload = await c.req.json();

  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    jobId: payload.job_id || payload.id || "unknown",
    payload,
    receivedAt: new Date().toISOString(),
  };
  webhookEvents.unshift(event);

  // Keep only last 50 events
  if (webhookEvents.length > 50) webhookEvents.length = 50;

  console.log(`[Webhook] Received event for job ${event.jobId}`, signature ? "(signed)" : "(unsigned)");

  return c.json({ received: true });
});

// List webhook events
app.get("/api/webhooks", (c) => {
  return c.json({ events: webhookEvents });
});

// Clear webhook events
app.delete("/api/webhooks", (c) => {
  webhookEvents.length = 0;
  return c.json({ cleared: true });
});

const port = 3001;
console.log(`Mock integration backend running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
