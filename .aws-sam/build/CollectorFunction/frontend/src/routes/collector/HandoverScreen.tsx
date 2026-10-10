import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import { SAMPLE_RECYCLERS } from "@shared/seed.data.js";
import type { RequestMeta, RecyclerMeta } from "@shared/types.js";

interface HandoverScreenProps {
  requestId: string;
  onNavigate: (route: string) => void;
}

export const HandoverScreen: React.FC<HandoverScreenProps> = ({ requestId, onNavigate }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<RequestMeta | null>(null);
  const [recyclers, setRecyclers] = useState<RecyclerMeta[]>([]);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const raw = localStorage.getItem("kabadilink_mock_requests");
        if (raw) {
          const all: RequestMeta[] = JSON.parse(raw);
          const found = all.find((r) => r.id === requestId);
          if (found) {
            setRequest(found);
            // Filter recyclers that accept all item categories in this request
            const itemCats = found.items.map((i) => i.category);
            const matching = SAMPLE_RECYCLERS.filter((rec) =>
              itemCats.every((c) => rec.acceptedCategories.includes(c))
            );
            // Fallback to all recyclers if strict filter yields 0
            const list = matching.length > 0 ? matching : SAMPLE_RECYCLERS;
            setRecyclers(list);
            if (list.length > 0) {
              setSelectedRecyclerId(list[0].id);
            }
          } else {
            setErrorMsg("Request not found.");
          }
        }
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [requestId]);

  const handleHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !selectedRecyclerId) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const collectorId = request.collectorId || "COL-01";
      const res = await api.handoverToRecycler(request.id, collectorId, selectedRecyclerId);
      onNavigate(`/receipt/${res.receipt.receiptId}`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Handover failed.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="main-container" style={{ textAlign: "center", padding: "40px" }}>Loading handover details...</div>;
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
          <span className="kitsch-sticker kitsch-sticker-pink">★ RECYCLER HANDOVER ★</span>
          <span className="kitsch-sticker kitsch-sticker-gold">CPCB APPROVED SAMPLE</span>
        </div>
        <h1 className="page-title">{t("collector.handoverTitle")}</h1>
        <p className="page-subtitle">🏭 Deliver to Authorised Facility & Generate Official Cryptographic Receipt 📜</p>
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
        {/* Left Column: Cargo Summary */}
        <div className="card" style={{ borderLeft: "8px solid var(--kitsch-acidgreen)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.4rem", fontWeight: 800, color: "var(--kitsch-black)" }}>
              {request.code}
            </span>
            <span className="kitsch-sticker kitsch-sticker-green" style={{ fontSize: "0.8rem" }}>
              ⚖️ WEIGHED: {request.actualWeightKg || request.estimatedWeightKg} KG
            </span>
          </div>

          <div style={{ fontSize: "0.88rem", fontFamily: "var(--font-kitsch-fun)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div>👤 Resident: <strong style={{ color: "var(--kitsch-black)" }}>{request.householdName}</strong></div>
            <div>📍 Origin: <strong style={{ color: "var(--kitsch-black)" }}>{request.locality}</strong></div>
            <div>📦 Items: <strong style={{ color: "var(--kitsch-black)" }}>{request.items.map((i) => `${i.quantity}x ${i.category}`).join(", ")}</strong></div>
          </div>

          <div style={{ marginTop: "16px", padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "0.75rem", fontFamily: "var(--font-kitsch-comic)", fontWeight: 700, color: "var(--text-muted)" }}>
            ℹ️ Under CPCB rules, handing over e-waste to an authorised recycler generates the official sales proof receipt with a SHA-256 tamper-check fingerprint.
          </div>
        </div>

        {/* Right Column: Recycler Selection Form */}
        <form onSubmit={handleHandover} className="card">
          <div className="form-group">
            <label className="form-label">{t("collector.selectRecycler")} *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recyclers.map((r) => (
                <label
                  key={r.id}
                  className="card-interactive"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px",
                    borderRadius: "var(--radius-md)",
                    border:
                      selectedRecyclerId === r.id
                        ? "3px solid var(--kitsch-hotpink)"
                        : "2px solid var(--kitsch-black)",
                    background:
                      selectedRecyclerId === r.id
                        ? "linear-gradient(135deg, #fff0f7 0%, #ffe4f0 100%)"
                        : "#ffffff",
                    boxShadow:
                      selectedRecyclerId === r.id
                        ? "4px 4px 0px var(--kitsch-hotpink)"
                        : "3px 3px 0px var(--kitsch-black)"
                  }}
                >
                  <input
                    type="radio"
                    name="recyclerSelection"
                    value={r.id}
                    checked={selectedRecyclerId === r.id}
                    onChange={() => setSelectedRecyclerId(r.id)}
                    style={{ marginTop: "4px", width: "20px", height: "20px", accentColor: "var(--kitsch-hotpink)" }}
                  />
                  <div>
                    <div style={{ fontFamily: "var(--font-kitsch-title)", color: "var(--kitsch-black)", fontSize: "1.1rem" }}>
                      🏭 {r.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-kitsch-fun)", color: "#6b21a8", marginTop: "2px" }}>
                      Reg No: <span style={{ fontFamily: "var(--font-kitsch-mono)", color: "var(--kitsch-black)", fontWeight: 800, fontSize: "1rem" }}>{r.sampleRegNo}</span> (SAMPLE)
                    </div>
                    <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-kitsch-comic)", fontWeight: 700, color: "var(--text-muted)", marginTop: "2px" }}>
                      Zone: {r.zone} • {r.address}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-block"
            style={{ minHeight: "56px", fontSize: "1.15rem", marginTop: "16px" }}
          >
            {submitting ? "Issuing Receipt..." : `📜 ${t("collector.handoverButton")} ✨`}
          </button>
        </form>
      </div>
    </div>
  );
};

