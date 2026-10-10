import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";

interface VerifyViewProps {
  receiptId?: string;
  onNavigate: (route: string) => void;
}

export const VerifyView: React.FC<VerifyViewProps> = ({ receiptId = "", onNavigate }) => {
  const { t } = useTranslation();

  const [inputReceiptId, setInputReceiptId] = useState(receiptId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    isValid?: boolean;
    shortCode?: string;
    verifiedAt?: string;
    message?: string;
    publicData?: {
      receiptId: string;
      requestCode: string;
      issuedAt: string;
      householdFirstName: string;
      locality: string;
      items: Array<{ category: string; quantity: number; hasBattery: boolean }>;
      actualWeightKg: number;
      collectorName: string;
      recyclerName: string;
      recyclerRegNo: string;
      statusTimeline: Array<{ status: string; timestamp: string; note: string }>;
      isSample: true;
      disclaimer: string;
    };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runVerification = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.verifyReceipt(idToVerify.trim());
      setResult(res);
      if (!res.found) {
        setErrorMsg(t("verify.notFound"));
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Verification failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (receiptId) {
      runVerification(receiptId);
    }
  }, [receiptId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runVerification(inputReceiptId);
  };

  return (
    <div className="main-container">
      <div className="page-title-box">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-green">★ 100% SECURE ★</span>
          <span className="kitsch-sticker kitsch-sticker-pink">ANTI-TAMPER SCANNER</span>
        </div>
        <h1 className="page-title">{t("verify.title")}</h1>
        <p className="page-subtitle">🛡️ Cryptographic SHA-256 Public Tamper Verification ⚡</p>
      </div>

      {/* Lookup Card */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t("verify.receiptInput")}</label>
            <input
              type="text"
              required
              className="form-input"
              value={inputReceiptId}
              onChange={(e) => setInputReceiptId(e.target.value)}
              placeholder="e.g. RCP-77A14B82"
              style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.2rem", textTransform: "uppercase" }}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-accent-cyan btn-block" style={{ fontSize: "1.1rem" }}>
            {loading ? "Scanning Blockchain..." : `🛡️ ${t("verify.verifyBtn")} 🔍`}
          </button>
        </form>
      </div>

      {errorMsg && (
        <div
          style={{
            background: "#ffe4e6",
            border: "3px solid #e11d48",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            color: "#881337",
            fontFamily: "var(--font-kitsch-fun)",
            fontWeight: 800,
            fontSize: "0.9rem",
            boxShadow: "4px 4px 0px var(--kitsch-black)"
          }}
        >
          🚨 <strong>ALERT:</strong> {errorMsg}
        </div>
      )}

      {/* Verification Result Card */}
      {result && result.found && (
        <div className="responsive-two-col">
          <div
            className="card"
            style={{
              borderLeft: result.isValid ? "8px solid var(--kitsch-acidgreen)" : "8px solid var(--kitsch-hotpink)",
              background: result.isValid ? "#f0fdf4" : "#fff1f2",
              boxShadow: result.isValid ? "6px 6px 0px var(--kitsch-acidgreen), 8px 8px 0px var(--kitsch-black)" : "6px 6px 0px var(--kitsch-hotpink), 8px 8px 0px var(--kitsch-black)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <span style={{ fontSize: "2.2rem" }}>{result.isValid ? "🪩" : "⚠️"}</span>
              <div>
                <div
                  style={{
                    fontSize: "1.3rem",
                    fontFamily: "var(--font-kitsch-title)",
                    color: result.isValid ? "#15803d" : "#be123c"
                  }}
                >
                  {result.isValid ? `✨ ${t("verify.valid")} ✨` : t("verify.tampered")}
                </div>
                <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-kitsch-fun)", color: "var(--text-muted)", fontWeight: 700 }}>
                  {result.isValid ? t("verify.validMsg") : t("verify.tamperedMsg")}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "2px solid var(--kitsch-black)",
                padding: "10px 14px",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "10px",
                boxShadow: "2px 2px 0px var(--kitsch-black)"
              }}
            >
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-kitsch-display)", color: "#6b21a8" }}>
                {t("verify.shortCode")}:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-kitsch-mono)",
                  fontWeight: 800,
                  color: "var(--kitsch-black)",
                  fontSize: "1.25rem",
                  letterSpacing: "0.1em"
                }}
              >
                {result.shortCode}
              </span>
            </div>
          </div>

          {/* Minimal Public Snapshot (NO Phone Number) */}
          {result.publicData && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.1rem" }}>
                  📜 Public Verification Snapshot
                </h3>
                <span className="kitsch-sticker kitsch-sticker-green" style={{ fontSize: "0.62rem" }}>
                  AUTHENTICATED
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.88rem", fontFamily: "var(--font-kitsch-fun)", marginBottom: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Resident:</span>
                  <div style={{ fontWeight: 800 }}>👤 {result.publicData.householdFirstName}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Locality:</span>
                  <div style={{ fontWeight: 800 }}>📍 {result.publicData.locality}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Collector:</span>
                  <div style={{ fontWeight: 800 }}>🛵 {result.publicData.collectorName}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Recycler (SAMPLE):</span>
                  <div style={{ fontWeight: 800 }}>🏭 {result.publicData.recyclerName}</div>
                </div>
                <div style={{ background: "#dcfce7", padding: "8px", borderRadius: "8px", border: "2px solid #16a34a" }}>
                  <span style={{ fontSize: "0.7rem", color: "#14532d", textTransform: "uppercase", fontWeight: 800 }}>Confirmed Weight:</span>
                  <div style={{ fontWeight: 800, color: "#15803d", fontSize: "1.05rem" }}>
                    ⚖️ {result.publicData.actualWeightKg} kg
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Request Code:</span>
                  <div style={{ fontFamily: "var(--font-kitsch-mono)", fontWeight: 800, fontSize: "1rem" }}>
                    {result.publicData.requestCode}
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div style={{ borderTop: "2px dashed var(--kitsch-black)", paddingTop: "10px", marginBottom: "12px" }}>
                <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-kitsch-display)", color: "#6b21a8", marginBottom: "6px" }}>
                  ITEMS DELIVERED:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {result.publicData.items.map((it, idx) => (
                    <span
                      key={idx}
                      className="kitsch-sticker kitsch-sticker-yellow"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {it.quantity}x {it.category} {it.hasBattery ? "🔋" : ""}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-kitsch-comic)",
                  fontWeight: 700,
                  color: "#6b21a8",
                  background: "#fffdf0",
                  border: "2px solid var(--kitsch-black)",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "center"
                }}
              >
                🔒 Public verification view. Resident contact numbers and sensitive addresses are stripped for privacy under EPR guidelines.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
