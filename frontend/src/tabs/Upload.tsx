import { useCallback, useRef, useState } from "react";
import { requestUploadUrl, uploadToS3, confirmUpload } from "../api";

type LogEntry = { time: string; msg: string; type: "info" | "success" | "error" };

interface Props {
  onImageUploaded: (publicUrl: string) => void;
}

export function UploadTab({ onImageUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0); // 0=idle, 1=presign, 2=uploading, 3=confirming, 4=done
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resultUrl, setResultUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const log = (msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), msg, type },
    ]);
  };

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      log("El archivo debe ser una imagen", "error");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setLogs([]);
    setStep(0);
    setResultUrl("");
    log(`Archivo seleccionado: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
  };

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setLogs([]);

    try {
      // Step 1: Request presigned URL
      setStep(1);
      log("Solicitando URL presignada al servidor...");
      const key = `demo/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const uploadRes = await requestUploadUrl(key, file.type, file.name);
      log(`URL presignada recibida (file ID: ${uploadRes.id})`, "success");
      log(`Key S3: ${uploadRes.key}`);

      // Step 2: Upload to S3
      setStep(2);
      log("Subiendo archivo a S3 via URL presignada...");
      await uploadToS3(uploadRes.presigned_url, file);
      log("Archivo subido exitosamente a S3", "success");

      // Step 3: Confirm
      setStep(3);
      log("Confirmando subida al servidor...");
      await confirmUpload(uploadRes.id, file.size);
      log("Subida confirmada", "success");

      setStep(4);
      const publicUrl = uploadRes.public_url;
      setResultUrl(publicUrl);
      log(`URL publica: ${publicUrl}`, "success");
      log("Proceso completado. Puedes usar esta URL para el analisis.", "success");
    } catch (err: any) {
      log(`Error: ${err.message}`, "error");
      setStep(0);
    } finally {
      setUploading(false);
    }
  }, [file]);

  const stepLabels = [
    "Seleccionar archivo",
    "Obteniendo URL presignada",
    "Subiendo a S3",
    "Confirmando subida",
    "Completado",
  ];

  return (
    <>
      {/* Explanation */}
      <div className="card">
        <div className="step-badge">
          <span className="num">1</span> Subir Imagen
        </div>
        <h2>Flujo de Subida de Archivos</h2>
        <p className="desc">
          El proceso de subida usa URLs presignadas de S3 para mayor seguridad.
          Tu servidor nunca maneja el archivo directamente — el cliente sube
          directamente a S3.
        </p>

        <div className="flow">
          {stepLabels.map((label, i) => (
            <span key={i} style={{ display: "contents" }}>
              {i > 0 && <span className="flow-arrow">&rarr;</span>}
              <div
                className={`flow-step ${step > i ? "done" : step === i ? "active" : ""}`}
              >
                {step > i ? "\u2713 " : ""}
                {label}
              </div>
            </span>
          ))}
        </div>

        <div className="code-block">
          <pre>{`// Paso 1: Solicitar URL presignada
const res = await fetch("/s3/upload", {
  method: "POST",
  headers: { "X-API-Key": "vst_...", "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "demo/mi-imagen.jpg",
    contentType: "image/jpeg",
    originalFilename: "mi-imagen.jpg"
  })
});
// Respuesta: { id, key, public_url, presigned_url, status }

// Paso 2: Subir directamente a S3
await fetch(presigned_url, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": "image/jpeg" }
});

// Paso 3: Confirmar la subida
await fetch(\`/s3/files/\${id}/confirm\`, {
  method: "POST",
  headers: { "X-API-Key": "vst_...", "Content-Type": "application/json" },
  body: JSON.stringify({ fileSize: file.size })
});`}</pre>
        </div>
      </div>

      {/* Upload form */}
      <div className="card">
        <h3>Probar Subida</h3>

        <div
          className={`dropzone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="icon">&#128247;</div>
          <p>
            {file
              ? file.name
              : "Arrastra una imagen aqui o haz clic para seleccionar"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        {preview && (
          <img src={preview} alt="Vista previa" className="image-preview" />
        )}

        <div className="btn-row">
          <button
            className="btn btn-primary"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading && <span className="spinner" />}
            {uploading ? "Subiendo..." : "Subir Imagen"}
          </button>

          {resultUrl && (
            <button
              className="btn btn-primary"
              onClick={() => onImageUploaded(resultUrl)}
            >
              Usar para Analisis &rarr;
            </button>
          )}
        </div>

        {logs.length > 0 && (
          <div className="log">
            {logs.map((l, i) => (
              <div className="log-entry" key={i}>
                <span className="log-time">{l.time}</span>
                <span className={`log-msg ${l.type}`}>{l.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
