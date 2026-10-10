import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import { SAMPLE_COLLECTORS } from "@shared/seed.data.js";
import type { LocalityGroup } from "../../api/apiInterface.js";
import type { RequestMeta } from "@shared/types.js";
import { StatusBadge } from "../../components/StatusBadge.js";

interface CollectorHomeProps {
  onNavigate: (route: string) => void;
}

export const CollectorHome: React.FC<CollectorHomeProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const [selectedCollectorId, setSelectedCollectorId] = useState<string>("COL-01");
  const [loading, setLoading] = useState(true);
  const [localityGroups, setLocalityGroups] = useState<LocalityGroup[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<RequestMeta[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "assigned">("open");
  const [acceptingLocality, setAcceptingLocality] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedCollector = SAMPLE_COLLECTORS.find((c) => c.id === selectedCollectorId) || SAMPLE_COLLECTORS[0];

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch open requests grouped by locality
      const res = await api.getCollectorRequests(undefined, selectedCollectorId);
      setLocalityGroups(res.localityGroups);

      // 2. Fetch assigned requests for this collector from mock/api
      // For mock or real, we can filter open + active requests
      // In mock, let's load all assigned requests
      const allRes = await api.getCollectorRequests(); // gets all
      // We can also check localStorage or query API
      const raw = localStorage.getItem("kabadilink_mock_requests");
      if (raw) {
        const all: RequestMeta[] = JSON.parse(raw);
        const myActive = all.filter(
          (r) =>
            r.collectorId === selectedCollectorId &&
            (r.status === "ACCEPTED" || r.status === "PICKED_UP" || r.status === "HANDED_TO_RECYCLER")
        );
        setAssignedRequests(myActive);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCollectorId]);

  const handleAcceptTrip = async (group: LocalityGroup) => {
    setAcceptingLocality(group.locality);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const requestIds = group.requests.map((r) => r.id);
      const res = await api.acceptTrip(selectedCollectorId, requestIds);
      setSuccessMsg(
        `Accepted trip in ${group.locality} (${res.acceptedIds.length} pickups reserved)!`
      );
      await loadData();
      setActiveTab("assigned");
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to accept trip.");
    } finally {
      setAcceptingLocality(null);
    }
  };

  return (
    <div className="main-container">
      {/* Title & Demo Tag */}
      <div className="page-title-box">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-gold">★ DISPATCH HQ ★</span>
          <span className="kitsch-sticker kitsch-sticker-pink">🛵 INSTANT CASH</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="page-title">{t("collector.title")}</h1>
          <span className="starburst-badge">
            {t("collector.demoLabel")}
          </span>
        </div>
        <p className="page-subtitle">📦 Accept Trips & Collect Verified Scrap with Fast Handover 🏭</p>
      </div>

      {/* Collector Profile Switcher */}
      <div className="card" style={{ padding: "14px", borderLeft: "8px solid var(--kitsch-gold)" }}>
        <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-kitsch-display)", color: "#713f12", marginBottom: "8px" }}>
          👤 {t("collector.selectCollector")}:
        </div>
        <div className="collector-selector">
          {SAMPLE_COLLECTORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCollectorId(c.id)}
              className={`collector-pill ${selectedCollectorId === c.id ? "active" : ""}`}
            >
              <span>👤 {c.name}</span>
              <span style={{ opacity: 0.9, fontSize: "0.75rem" }}>({c.id})</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-kitsch-fun)", color: "var(--text-main)", marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span className="kitsch-sticker kitsch-sticker-yellow" style={{ fontSize: "0.65rem" }}>
            ZONE: {selectedCollector.zone}
          </span>
          <span className="kitsch-sticker kitsch-sticker-cyan" style={{ fontSize: "0.65rem" }}>
            VEHICLE: {selectedCollector.vehicleType}
          </span>
        </div>
      </div>

      {/* Tabs: Open Trips vs My Active Pickups */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => setActiveTab("open")}
          className={`btn ${activeTab === "open" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, minHeight: "44px", padding: "8px", fontSize: "0.9rem" }}
        >
          📍 Available Trips ({localityGroups.reduce((acc, g) => acc + g.requestCount, 0)})
        </button>
        <button
          onClick={() => setActiveTab("assigned")}
          className={`btn ${activeTab === "assigned" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, minHeight: "44px", padding: "8px", fontSize: "0.9rem" }}
        >
          🛵 My Trip Pickups ({assignedRequests.length})
        </button>
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

      {loading ? (
        <div style={{ textAlign: "center", padding: "30px", fontFamily: "var(--font-kitsch-fun)", fontSize: "1.1rem" }}>
          🔄 Loading trip data...
        </div>
      ) : activeTab === "open" ? (
        // Open Trips Tab
        <div>
          {localityGroups.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "30px", fontFamily: "var(--font-kitsch-comic)", fontWeight: 700 }}>
              🎉 {t("collector.noOpenTrips")}
            </div>
          ) : (
            <div className="responsive-two-col">
              {localityGroups.map((group) => (
                <div key={group.locality} className="locality-card" style={{ borderLeft: "8px solid var(--kitsch-acidgreen)", marginBottom: 0 }}>
                  <div className="locality-card-header">
                    <div className="locality-name">📍 {group.locality}</div>
                    <span className="kitsch-sticker kitsch-sticker-pink" style={{ fontSize: "0.75rem" }}>
                      {group.requestCount} Pickups
                    </span>
                  </div>

                  <div className="stat-pills">
                    <div className="stat-pill">
                      <span className="stat-pill-label">{t("collector.estWeight")}</span>
                      <span className="stat-pill-val">⚖️ {group.totalEstimatedWeightKg} kg</span>
                    </div>
                    <div className="stat-pill" style={{ background: "#fef9c3", borderColor: "#ca8a04" }}>
                      <span className="stat-pill-label" style={{ color: "#854d0e" }}>{t("collector.estPayout")}</span>
                      <span className="stat-pill-val" style={{ color: "#15803d" }}>
                        💰 ~₹{group.illustrativePayoutEstimate}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-kitsch-comic)", color: "var(--text-muted)", marginBottom: "12px", fontWeight: 700 }}>
                    ℹ️ {t("collector.payoutDisclaimer")}
                  </div>

                  <button
                    onClick={() => handleAcceptTrip(group)}
                    disabled={acceptingLocality === group.locality}
                    className="btn btn-accent-yellow btn-block"
                    style={{ minHeight: "52px", fontSize: "1.1rem" }}
                  >
                    {acceptingLocality === group.locality
                      ? t("collector.accepting")
                      : `🛵 ${t("collector.acceptTrip")} (${group.requestCount}) 🔥`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // My Assigned Pickups Tab
        <div>
          {assignedRequests.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "30px", fontFamily: "var(--font-kitsch-comic)", fontWeight: 700 }}>
              No active pickups assigned to {selectedCollector.name}. Pick a trip from the available trips tab!
            </div>
          ) : (
            <div className="responsive-two-col">
              {assignedRequests.map((req) => (
                <div key={req.id} className="card" style={{ borderLeft: "8px solid var(--kitsch-cyan)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.3rem", fontWeight: 800, color: "var(--kitsch-black)" }}>
                        {req.code}
                      </span>
                      <div style={{ fontSize: "0.95rem", fontFamily: "var(--font-kitsch-fun)", fontWeight: 800, color: "var(--text-main)" }}>
                        👤 {req.householdName}
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-kitsch-fun)", color: "var(--text-muted)", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div>📍 <strong>{req.locality}</strong> {req.landmark ? `(${req.landmark})` : ""}</div>
                    <div>📞 {req.phone}</div>
                    <div>📦 {req.items.length} items (Est: {req.estimatedWeightKg} kg)</div>
                    {req.actualWeightKg && (
                      <div style={{ color: "#15803d", fontWeight: 800 }}>
                        ⚖️ Actual Scale Weight: {req.actualWeightKg} kg
                      </div>
                    )}
                  </div>

                  {/* Primary Action Button Based on State */}
                  {req.status === "ACCEPTED" && (
                    <button
                      onClick={() => onNavigate(`/collector/pickup/${req.id}`)}
                      className="btn btn-primary btn-block"
                      style={{ minHeight: "48px", fontSize: "1.05rem" }}
                    >
                      ⚖️ {t("collector.confirmPickup")} (OTP + Weight) →
                    </button>
                  )}

                  {req.status === "PICKED_UP" && (
                    <button
                      onClick={() => onNavigate(`/collector/handover/${req.id}`)}
                      className="btn btn-accent-cyan btn-block"
                      style={{ minHeight: "48px", fontSize: "1.05rem" }}
                    >
                      🏭 {t("collector.handoverTitle")} →
                    </button>
                  )}

                  {req.status === "HANDED_TO_RECYCLER" && req.receiptId && (
                    <button
                      onClick={() => onNavigate(`/receipt/${req.receiptId}`)}
                      className="btn btn-secondary btn-block"
                      style={{ minHeight: "44px", fontSize: "0.95rem" }}
                    >
                      📜 View Issued Receipt ({req.receiptId}) →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
