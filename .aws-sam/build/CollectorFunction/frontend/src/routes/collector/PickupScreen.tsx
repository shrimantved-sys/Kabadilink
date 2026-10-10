import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import type { RequestMeta } from "@shared/types.js";

interface PickupScreenProps {
  requestId: string;
  onNavigate: (route: string) => void;
}

export const PickupScreen: React.FC<PickupScreenProps> = ({ requestId, onNavigate }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<RequestMeta | null>(null);
  const [otp, setOtp] = useState("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // In mock or real, find request
    const loadReq = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const raw = localStorage.getItem("kabadilink_mock_requests");
        if (raw) {
          const all: RequestMeta[] = JSON.parse(raw);
          const found = all.find((r) => r.id === requestId);
          if (found) {
            setRequest(found);
            setWeightKg(found.estimatedWeightKg); // prefill with estimated weight as starting point
          } else {
            setErrorMsg("Request not found.");
          }
        }
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || "Failed to load request.");
      } finally {
        setLoading(false);
      }
    };
    loadReq();
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!/^\d{4}$/.test(otp.trim())) {
      setErrorMsg("Please enter a valid 4-digit OTP.");
      return;
    }

    const numWeight = Number(weightKg);
    if (isNaN(numWeight) || numWeight < 0.1 || numWeight > 200) {
      setErrorMsg("Actual scale weight must be between 0.1 kg and 200 kg.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const collectorId = request.collectorId || "COL-01";
      await api.confirmPickup(request.id, collectorId, otp.trim(), numWeight);
      // Navigate to handover screen
      onNavigate(`/collector/handover/${request.id}`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Pickup verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="main-container" style={{ textAlign: "center", padding: "40px" }}>Loading pickup details...</div>;
  }

  if (!request) {
    return (
      <div className="main-container">
        <div className="card" style={{ textAlign: "center", color: "#fda4af" }}>
          {errorMsg || "Request not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="page-title-box">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-green">★ WEIGH-O-MATIC ★</span>
          <span className="kitsch-sticker kitsch-sticker-yellow">DOORSTEP INTAKE</span>
        </div>
        <h1 className="page-title">{t("collector.pickupTitle")}</h1>
        <p className="page-subtitle">⚖️ Inspect Items, Confirm OTP & Log Scale Weight</p>
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
          🚨 <strong>ERROR:</strong> {errorMsg}
        </div>
      )}

      <div className="responsive-two-col">
        {/* Left Column: Household & Pickup Info Card */}
        <div className="card" style={{ borderLeft: "8px solid var(--kitsch-hotpink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.4rem", fontWeight: 800, color: "var(--kitsch-black)" }}>
              {request.code}
            </span>
            <span className="kitsch-sticker kitsch-sticker-green" style={{ fontSize: "0.75rem" }}>
              Est: {request.estimatedWeightKg} kg
            </span>
          </div>

          <div style={{ fontSize: "0.9rem", fontFamily: "var(--font-kitsch-fun)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div>👤 Resident: <strong style={{ color: "var(--kitsch-black)" }}>{request.householdName}</strong></div>
            <div>📞 Mobile: <strong style={{ color: "var(--kitsch-black)" }}>{request.phone}</strong></div>
            <div>📍 Locality: <strong style={{ color: "var(--kitsch-black)" }}>{request.locality} {request.landmark ? `(${request.landmark})` : ""}</strong></div>
          </div>

          <div style={{ marginTop: "14px", borderTop: "2px dashed var(--kitsch-black)", paddingTop: "10px" }}>
            <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-kitsch-display)", color: "#6b21a8", marginBottom: "6px" }}>
              ITEMS DECLARED:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {request.items.map((it, idx) => (
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
        </div>

        {/* Right Column: Verification & Weighing Form */}
        <form onSubmit={handleSubmit} className="card" style={{ background: "#fffdf0" }}>
          <div className="form-group">
            <label className="form-label">
              <span>🔑 {t("collector.otpLabel")} *</span>
              <span style={{ fontSize: "0.72rem", color: "#6b21a8" }}>Ask Resident</span>
            </label>
            <input
              type="text"
              required
              maxLength={4}
              pattern="\d{4}"
              className="form-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 4821"
              style={{
                fontSize: "2rem",
                fontFamily: "var(--font-kitsch-mono)",
                letterSpacing: "0.3em",
                textAlign: "center",
                background: "#ffffff",
                color: "var(--kitsch-black)",
                border: "3px solid var(--kitsch-black)"
              }}
            />
            <span className="form-help">{t("collector.otpHelp")}</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>⚖️ {t("collector.actualWeight")} (KG) *</span>
              <span className="kitsch-sticker kitsch-sticker-pink" style={{ fontSize: "0.62rem" }}>CALIBRATED SCALE</span>
            </label>
            <input
              type="number"
              required
              step="0.1"
              min="0.1"
              max="200"
              className="form-input"
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value) || "")}
              placeholder="e.g. 3.4"
              style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "var(--font-kitsch-fun)", textAlign: "center" }}
            />
            <span className="form-help">{t("collector.weightHelp")}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-accent-green btn-block"
            style={{ minHeight: "56px", fontSize: "1.2rem", marginTop: "12px" }}
          >
            {submitting ? "Verifying..." : `✓ ${t("collector.confirmPickup")} 🚀`}
          </button>
        </form>
      </div>
    </div>
  );
};

