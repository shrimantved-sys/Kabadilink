import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import type { RequestMeta, RequestEvent } from "@shared/types.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { Timeline } from "../../components/Timeline.js";

interface TrackRequestProps {
  initialCode?: string;
  initialLastFour?: string;
  onNavigate: (route: string) => void;
}

export const TrackRequest: React.FC<TrackRequestProps> = ({
  initialCode = "",
  initialLastFour = "",
  onNavigate
}) => {
  const { t } = useTranslation();

  const [code, setCode] = useState(initialCode);
  const [lastFour, setLastFour] = useState(initialLastFour);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [request, setRequest] = useState<RequestMeta | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchStatus = async (lookupCode: string, lookupLastFour: string) => {
    if (!lookupCode.trim() || !lookupLastFour.trim()) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.getRequest(lookupCode.trim(), lookupLastFour.trim());
      setRequest(res.request);
      setEvents(res.events);
    } catch (err: unknown) {
      setError((err as Error).message || "Could not find request with those details.");
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialLastFour) {
      fetchStatus(initialCode, initialLastFour);
    }
  }, [initialCode, initialLastFour]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(code, lastFour);
  };

  const handleCancel = async () => {
    if (!request) return;
    if (!window.confirm(t("household.cancelConfirm"))) return;

    setCancelling(true);
    setError(null);
    try {
      const res = await api.cancelRequest(request.id, "Cancelled by resident via tracking portal.");
      setRequest(res.request);
      setSuccessMsg("Pickup request successfully cancelled.");
      // Refresh events
      fetchStatus(code, lastFour);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to cancel request.");
    } finally {
      setCancelling(false);
    }
  };

  const isCancelable = request && (request.status === "REQUESTED" || request.status === "ACCEPTED");

  return (
    <div className="main-container">
      <div className="page-title-box">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-cyan">★ LIVE TRACKER ★</span>
          <span className="kitsch-sticker kitsch-sticker-yellow">REAL-TIME RADAR</span>
        </div>
        <h1 className="page-title">{t("household.trackTitle")}</h1>
        <p className="page-subtitle">📡 Track Your Scrap Request & Digital Paper Trail ⚡</p>
      </div>

      {/* Lookup Card */}
      <div className="card">
        <form onSubmit={handleSearch}>
          <div className="form-group">
            <label className="form-label">{t("household.requestCode")}</label>
            <input
              type="text"
              required
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("household.codePlaceholder")}
              style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.2rem", textTransform: "uppercase" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("household.lastFour")}</label>
            <input
              type="text"
              required
              maxLength={4}
              pattern="\d{4}"
              className="form-input"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
              placeholder={t("household.lastFourPlaceholder")}
              style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.2rem" }}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-accent-yellow btn-block" style={{ fontSize: "1.1rem" }}>
            {loading ? "Searching..." : `🔍 ${t("household.trackButton")}`}
          </button>
        </form>
      </div>

      {error && (
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
          🚨 <strong>ERROR:</strong> {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: "#dcfce7",
            border: "3px solid #16a34a",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            color: "#14532d",
            fontFamily: "var(--font-kitsch-fun)",
            fontWeight: 800,
            fontSize: "0.9rem",
            boxShadow: "4px 4px 0px var(--kitsch-black)"
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Result Details */}
      {request && (
        <div className="responsive-two-col">
          {/* Left Column: Status Card */}
          <div className="card" style={{ borderLeft: "8px solid var(--kitsch-hotpink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <span className="kitsch-sticker kitsch-sticker-pink" style={{ fontSize: "0.62rem" }}>
                  TRACKING ID
                </span>
                <div style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.6rem", fontWeight: 800, color: "var(--kitsch-black)" }}>
                  {request.code}
                </div>
              </div>
              <StatusBadge status={request.status} />
            </div>

            {/* OTP Notice if still active */}
            {(request.status === "REQUESTED" || request.status === "ACCEPTED") && request.pickupOtp && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fef08a 0%, #fde047 100%)",
                  border: "3px solid var(--kitsch-black)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                  boxShadow: "4px 4px 0px var(--kitsch-black)"
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-kitsch-display)", fontSize: "0.75rem", color: "#713f12" }}>
                    YOUR 4-DIGIT PICKUP OTP:
                  </div>
                  <div style={{ fontFamily: "var(--font-kitsch-comic)", fontSize: "0.75rem", color: "#854d0e", fontWeight: 700 }}>
                    🔒 Tell this to collector on arrival
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-kitsch-mono)",
                    color: "var(--kitsch-black)",
                    background: "#ffffff",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0px #000"
                  }}
                >
                  {request.pickupOtp}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.88rem", fontFamily: "var(--font-kitsch-fun)" }}>
              <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Locality:</span>
                <div style={{ fontWeight: 800 }}>📍 {request.locality}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Est. Weight:</span>
                <div style={{ fontWeight: 800 }}>
                  ⚖️ {request.items.length} items ({request.estimatedWeightKg} kg)
                </div>
              </div>
              {request.actualWeightKg && (
                <div style={{ background: "#dcfce7", padding: "8px", borderRadius: "8px", border: "2px solid #16a34a", gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "0.72rem", color: "#14532d", textTransform: "uppercase", fontWeight: 800 }}>Confirmed Scale Weight:</span>
                  <div style={{ fontWeight: 800, color: "#15803d", fontSize: "1.1rem" }}>⚖️ {request.actualWeightKg} kg</div>
                </div>
              )}
            </div>

            {/* View Receipt Button if generated */}
            {request.receiptId && (
              <div style={{ marginTop: "16px" }}>
                <button
                  onClick={() => onNavigate(`/receipt/${request.receiptId}`)}
                  className="btn btn-primary btn-block"
                  style={{ fontSize: "1.1rem" }}
                >
                  📜 {t("household.viewReceipt")} ✨ →
                </button>
              </div>
            )}

            {/* Cancel Action */}
            {isCancelable && (
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="btn btn-danger btn-block"
                  style={{ minHeight: "40px", padding: "10px", fontSize: "0.9rem" }}
                >
                  {cancelling ? "Cancelling..." : `❌ ${t("household.cancelButton")}`}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Timeline Card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.1rem" }}>
                📋 Lifecycle Timeline
              </h3>
              <span className="kitsch-sticker kitsch-sticker-yellow" style={{ fontSize: "0.62rem" }}>
                AUDIT LOG
              </span>
            </div>
            <Timeline events={events} />
          </div>
        </div>
      )}
    </div>
  );
};
