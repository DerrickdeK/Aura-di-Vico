import React, { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";

/**
 * EmptyPhotoSlot — elegant placeholder shown when a POI/landmark has no
 * real photo yet. Visually unmistakable as a deliberate "coming soon"
 * state (not a broken image), branded in terracotta + cream.
 *
 * If `onUpload` is provided, an "Add a photo" CTA appears centred over the
 * placeholder and (when clicked) opens a file picker. The caller is
 * responsible for the actual upload + state propagation; this component
 * only handles the spinner UX while waiting.
 *
 * Usage:
 *   {image_url
 *     ? <img src={image_url} />
 *     : <EmptyPhotoSlot label={name} onUpload={(file) => uploadPoiImage(id, file)} />}
 */
export default function EmptyPhotoSlot({
  label = "",
  language = "en",
  variant = "card",       // "card" | "hero" | "thumb"
  className = "",
  testId = "empty-photo-slot",
  onUpload,                // optional async (file) => void
}) {
  const caption = language === "it" ? "Foto a venire" : "Photo coming soon";
  const ctaLabel = language === "it" ? "Aggiungi una foto" : "Add a photo";
  const dim = variant === "thumb" ? 18 : variant === "hero" ? 28 : 22;
  const initial = (label || "·").trim().charAt(0).toUpperCase();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !onUpload) return;
    setErrMsg("");
    setBusy(true);
    try {
      await onUpload(f);
    } catch (err) {
      setErrMsg(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      // Reset so the same file can be picked again if needed.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      data-testid={testId}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(245, 240, 232, 0.95) 0%, rgba(229, 218, 198, 0.85) 100%)",
        color: "var(--terracotta)",
      }}
    >
      {/* Initial watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center font-serif select-none"
        style={{
          fontSize: variant === "hero" ? "5rem" : variant === "thumb" ? "1.4rem" : "2.6rem",
          color: "rgba(189, 87, 69, 0.35)",
          fontWeight: 400,
        }}
        aria-hidden
      >
        {initial}
      </div>

      {/* Inline "Add a photo" CTA (only when caller wires onUpload) */}
      {onUpload && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            data-testid={`${testId}-add-btn`}
            className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 hover:opacity-100 focus:opacity-100 disabled:opacity-100"
            aria-label={ctaLabel}
            style={{
              background: "rgba(189, 87, 69, 0.55)",
              backdropFilter: "blur(2px)",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium"
              style={{
                background: "var(--terracotta)",
                color: "#fff",
                fontSize: variant === "thumb" ? 11 : 13,
                letterSpacing: "0.04em",
                boxShadow: "0 6px 16px rgba(189, 87, 69, 0.45)",
              }}
            >
              {busy ? <Loader2 size={dim / 1.6} className="animate-spin" /> : <Upload size={dim / 1.6} />}
              {busy ? (language === "it" ? "Caricamento…" : "Uploading…") : ctaLabel}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFile}
            data-testid={`${testId}-file-input`}
          />
        </>
      )}

      {/* "Photo coming soon" caption pill */}
      <div
        className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full pointer-events-none"
        style={{
          background: "rgba(255, 248, 235, 0.85)",
          backdropFilter: "blur(4px)",
          color: "rgba(120, 110, 95, 0.92)",
          fontSize: variant === "thumb" ? 9 : 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          width: "fit-content",
          maxWidth: "calc(100% - 1rem)",
          margin: variant === "thumb" ? "0 auto" : undefined,
        }}
      >
        <Camera size={dim / 2} strokeWidth={1.6} />
        <span className="truncate">{caption}</span>
      </div>

      {/* Error toast inside the slot (only when an upload fails) */}
      {errMsg && (
        <div
          className="absolute top-2 left-2 right-2 px-2 py-1 rounded text-xs"
          style={{ background: "#FFE3DC", color: "#7C2A1A" }}
          role="alert"
        >
          {errMsg}
        </div>
      )}
    </div>
  );
}
