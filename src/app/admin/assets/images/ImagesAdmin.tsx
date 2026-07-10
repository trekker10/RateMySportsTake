"use client";

import { useState, useRef, useCallback } from "react";
import type { AssetFile } from "./page";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  initialFiles: AssetFile[];
  bucketMissing: boolean;
}

export default function ImagesAdmin({ initialFiles, bucketMissing }: Props) {
  const [files, setFiles]           = useState<AssetFile[]>(initialFiles);
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState<string | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [search, setSearch]         = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = files.filter((f) =>
    !search.trim() || f.name.toLowerCase().includes(search.toLowerCase())
  );

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadErr(null);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "images");
    try {
      const res  = await fetch("/api/admin/assets/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setUploadErr(json.error ?? "Upload failed"); return; }
      // Prepend the new file to the list
      setFiles((prev) => [{
        name:      file.name,
        path:      json.path,
        url:       json.url,
        size:      file.size,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    } catch {
      setUploadErr("Network error — upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  async function deleteFile(path: string) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    setDeleting(path);
    try {
      const res = await fetch("/api/admin/assets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (res.ok) setFiles((prev) => prev.filter((f) => f.path !== path));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          Images
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
          Upload images to Supabase Storage and copy their public URLs for use in emails and templates.
        </p>
      </div>

      {/* Bucket missing warning */}
      {bucketMissing && (
        <div style={{ marginBottom: 24, padding: "14px 16px", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, fontSize: 13, color: "#713f12" }}>
          <strong>Storage bucket not found.</strong> Create a public bucket named <code style={{ background: "#fef08a", padding: "1px 5px", borderRadius: 3 }}>assets</code> in your{" "}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: "#92400e", fontWeight: 700 }}>
            Supabase dashboard
          </a>{" "}
          → Storage → New bucket → name it <strong>assets</strong>, enable <strong>Public bucket</strong>.
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginBottom: 24,
          border: `2px dashed ${dragOver ? "#111827" : "#d1d5db"}`,
          borderRadius: 10,
          background: dragOver ? "#f0fdf4" : "#f9fafb",
          padding: "32px 24px",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          transition: "border-color 0.15s, background 0.15s",
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={handleFileInput}
          style={{ display: "none" }}
        />
        {uploading ? (
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Uploading…</p>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#111827" }}>
              Click to upload or drag & drop
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>JPG, PNG, GIF, WebP, SVG — up to 10 MB</p>
          </>
        )}
      </div>

      {uploadErr && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 13, color: "#b91c1c" }}>
          {uploadErr}
        </div>
      )}

      {/* Search + count */}
      {files.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter images…"
            style={{ flex: 1, maxWidth: 280, border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none" }}
          />
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            {filtered.length} image{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Image grid */}
      {files.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#374151" }}>No images yet</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Upload your first image above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {filtered.map((f) => (
            <div
              key={f.path}
              style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              {/* Thumbnail */}
              <div style={{ background: "#f3f4f6", height: 140, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  loading="lazy"
                />
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFile(f.path); }}
                  disabled={deleting === f.path}
                  title="Delete"
                  style={{
                    position: "absolute", top: 6, right: 6,
                    width: 26, height: 26, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", border: "none",
                    color: "#fff", fontSize: 13, lineHeight: 1,
                    cursor: deleting === f.path ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: deleting === f.path ? 0.5 : 1,
                  }}
                >
                  {deleting === f.path ? "…" : "×"}
                </button>
              </div>

              {/* Info + actions */}
              <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#111827", wordBreak: "break-all", lineHeight: 1.4 }}>
                  {f.name.replace(/^\d+-/, "")}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                  {fmtSize(f.size)}{f.createdAt ? ` · ${fmtDate(f.createdAt)}` : ""}
                </p>

                {/* URL field + copy button */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    readOnly
                    value={f.url}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    style={{
                      flex: 1, minWidth: 0, border: "1px solid #e5e7eb", borderRadius: 4,
                      padding: "5px 7px", fontSize: 10, color: "#6b7280",
                      background: "#f9fafb", fontFamily: "monospace", cursor: "text",
                    }}
                  />
                  <button
                    onClick={() => copyUrl(f.url)}
                    title="Copy URL"
                    style={{
                      flexShrink: 0,
                      padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4,
                      background: copied === f.url ? "#dcfce7" : "#fff",
                      color: copied === f.url ? "#15803d" : "#374151",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      whiteSpace: "nowrap", transition: "background 0.15s",
                    }}
                  >
                    {copied === f.url ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
