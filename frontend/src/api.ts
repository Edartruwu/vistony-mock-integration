const BASE = "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Error ${res.status}`);
  }
  return data as T;
}

// ─── S3 Upload ───────────────────────────────────────────────────────────────

export interface UploadResponse {
  id: string;
  key: string;
  public_url: string;
  presigned_url: string;
  status: string;
}

export async function requestUploadUrl(
  key: string,
  contentType: string,
  originalFilename: string
): Promise<UploadResponse> {
  return request("/api/upload", {
    method: "POST",
    body: JSON.stringify({ key, contentType, originalFilename }),
  });
}

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error(`Error subiendo a S3: ${res.status}`);
}

export async function confirmUpload(fileId: string, fileSize: number) {
  return request(`/api/upload/${fileId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ fileSize }),
  });
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface AnalysisSubmitResponse {
  id: string;
  status: string;
  image_url: string;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  status: "pending" | "classifying" | "analyzing" | "completed" | "failed";
  image_url: string;
  classification?: {
    category: string;
    confidence: number;
    alternatives?: Array<{ category: string; confidence: number }>;
    reasoning?: string;
  };
  analysis?: {
    score: number;
    feedback: string;
    criteria_scores: Array<{
      criterion_id: string;
      criterion_name: string;
      score: number;
      weight: number;
      weighted_score: number;
      assessment: string;
      strengths: string[];
      weaknesses: string[];
    }>;
    brand_detected: boolean;
    brand_penalty_applied: boolean;
    recommendations?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
  processing_time_ms?: number;
  created_at: string;
  completed_at?: string;
}

export async function submitAnalysis(params: {
  image_url: string;
  async?: boolean;
  webhook_url?: string;
  force_type?: string;
}): Promise<AnalysisSubmitResponse> {
  return request("/api/analyze", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getAnalysisStatus(jobId: string): Promise<AnalysisResult> {
  return request(`/api/analyze/${jobId}`);
}

export async function retryAnalysis(jobId: string): Promise<AnalysisResult> {
  return request(`/api/analyze/${jobId}/retry`, { method: "POST" });
}

// ─── Quota ───────────────────────────────────────────────────────────────────

export interface QuotaInfo {
  used: number;
  remaining: number;
  max: number;
  is_unlimited: boolean;
}

export async function getQuota(): Promise<QuotaInfo> {
  return request("/api/quota");
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export interface WebhookEvent {
  id: string;
  jobId: string;
  payload: unknown;
  receivedAt: string;
}

export async function getWebhookEvents(): Promise<{ events: WebhookEvent[] }> {
  return request("/api/webhooks");
}

export async function clearWebhookEvents(): Promise<void> {
  await fetch(`${BASE}/api/webhooks`, { method: "DELETE" });
}
