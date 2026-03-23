import { useState } from "react";
import "./index.css";
import { OverviewTab } from "./tabs/Overview";
import { UploadTab } from "./tabs/Upload";
import { AnalysisTab } from "./tabs/Analysis";
import { WebhookTab } from "./tabs/Webhook";
import { HistoryTab } from "./tabs/History";

const TABS = [
  { id: "overview", label: "Resumen" },
  { id: "upload", label: "1. Subir Imagen" },
  { id: "analysis", label: "2. Analizar" },
  { id: "webhook", label: "3. Webhooks" },
  { id: "history", label: "Historial" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  return (
    <div className="app">
      <header>
        <h1>Vistony API</h1>
        <p>
          Documentacion interactiva — Plataforma de analisis de material
          publicitario con IA
        </p>
      </header>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab onNavigate={setTab} />}
      {tab === "upload" && (
        <UploadTab
          onImageUploaded={(url) => {
            setUploadedImageUrl(url);
            setTab("analysis");
          }}
        />
      )}
      {tab === "analysis" && <AnalysisTab prefilledUrl={uploadedImageUrl} />}
      {tab === "webhook" && <WebhookTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}
