import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import type { RequestMeta } from "@shared/types.js";
import { StatusBadge } from "../../components/StatusBadge.js";

interface DemoPanelProps {
  onNavigate: (route: string) => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestMeta[]>([]);

  const loadRequests = () => {
    const raw = localStorage.getItem("kabadilink_mock_requests");
    if (raw) {
      setRequests(JSON.parse(raw));
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.seedDemo();
      setSuccessMsg(`✓ ${res.message}`);
      loadRequests();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to seed demo data.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to clear all mock data?")) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.resetDemo();
      setSuccessMsg(`✓ ${res.message}`);
      setRequests([]);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to reset demo data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAck = async (requestId: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.simulateRecyclerAck(requestId);
      setSuccessMsg(
        `✓ Recycler facility intake confirmed for ${res.request.code} [SIMULATED]!`
      );
      loadRequests();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to simulate recycler intake.");
    } finally {
      setLoading(false);
    }
  };

  const handedOverRequests = requests.filter((r) => r.status === "HANDED_TO_RECYCLER");

  return (
    <div className="main-container">
      <div className="page-title-box">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-gold">★ GOD MODE LAB ★</span>
          <span className="kitsch-sticker kitsch-sticker-pink">ARCADE CONTROLS</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="page-title">{t("demo.title")}</h1>
          <span className="starburst-badge">
            {t("demo.simulatedTag")}
          </span>
        </div>
        <p className="page-subtitle">🧪 Seed, Reset & Simulate Full Recycler Facility Intakes 🪩</p>
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

      {/* Responsive 2-Column Content */}
      <div className="responsive-two-col">
        {/* Left Column: Controls & Simulation Queue */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Control Actions */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: "8px solid var(--kitsch-gold)" }}>
            <button
              onClick={handleSeed}
              disabled={loading}
              className="btn btn-accent-yellow btn-block"
              style={{ fontSize: "1.1rem" }}
            >
              🌱 {t("demo.seedBtn")} 🔥
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="btn btn-danger btn-block"
              style={{ fontSize: "1.1rem" }}
            >
              🗑️ {t("demo.resetBtn")} ⚠️
            </button>
          </div>

          {/* Simulate Recycler Intake */}
          <div className="card" style={{ borderLeft: "8px solid var(--kitsch-cyan)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.1rem" }}>
                🏭 {t("demo.simulateTitle")}
              </h3>
              <span className="kitsch-sticker kitsch-sticker-cyan" style={{ fontSize: "0.62rem" }}>
                {t("demo.simulatedTag")}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", fontFamily: "var(--font-kitsch-comic)", fontWeight: 700, color: "var(--text-muted)", marginBottom: "14px" }}>
              {t("demo.simulateHelp")}
            </p>

            {handedOverRequests.length === 0 ? (
              <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-kitsch-comic)", fontWeight: 700, color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "2px dashed #cbd5e1" }}>
                No requests currently in HANDED_TO_RECYCLER status. Click 'Seed Sample Data' above or complete a handover trip.
              </div>
            ) : (
              handedOverRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: "#fffdf0",
                    border: "2px solid var(--kitsch-black)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    marginBottom: "10px",
                    boxShadow: "3px 3px 0px var(--kitsch-black)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-kitsch-mono)", fontWeight: 800, color: "var(--kitsch-black)", fontSize: "1.15rem" }}>
                        {req.code}
                      </span>
                      <div style={{ fontSize: "0.88rem", color: "var(--text-main)", fontWeight: 800, fontFamily: "var(--font-kitsch-fun)" }}>
                        👤 {req.householdName} ({req.actualWeightKg} kg)
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  <button
                    onClick={() => handleSimulateAck(req.id)}
                    disabled={loading}
                    className="btn btn-accent-green btn-block"
                    style={{
                      minHeight: "42px",
                      padding: "6px 12px",
                      fontSize: "0.95rem",
                      marginTop: "8px"
                    }}
                  >
                    ✅ {t("demo.simulateBtn")} [SIMULATED]
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Current DB State Inspector */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.05rem" }}>
              📊 Active Database ({requests.length} Requests)
            </h3>
            <span className="kitsch-sticker kitsch-sticker-pink" style={{ fontSize: "0.62rem" }}>
              LOCAL STORAGE
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {requests.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "#fffdf0",
                  border: "2px solid var(--kitsch-black)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-kitsch-fun)",
                  boxShadow: "2px 2px 0px var(--kitsch-black)"
                }}
              >
                <div>
                  <span style={{ fontFamily: "var(--font-kitsch-mono)", color: "var(--kitsch-black)", fontWeight: 800, fontSize: "1rem" }}>
                    {r.code}
                  </span>{" "}
                  <span style={{ color: "var(--text-muted)" }}>({r.householdName})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <StatusBadge status={r.status} />
                  {r.receiptId && (
                    <button
                      onClick={() => onNavigate(`/receipt/${r.receiptId}`)}
                      style={{
                        background: "var(--kitsch-electricyellow)",
                        border: "2px solid var(--kitsch-black)",
                        color: "#000",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        boxShadow: "1px 1px 0px var(--kitsch-black)"
                      }}
                      title="View Receipt"
                    >
                      📜
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

