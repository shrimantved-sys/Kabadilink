import React, { useState } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import {
  LOCALITIES,
  ITEM_CATEGORIES,
  TIME_WINDOWS,
  TIME_WINDOW_LABELS,
  DATA_BEARING_CATEGORIES,
  BATTERY_LOOSE_BLOCK_MESSAGE,
  type Locality,
  type ItemCategory,
  type TimeWindow
} from "@shared/config.js";
import { calculateEstimatedWeightKg } from "@shared/validation.js";
import type { RequestItem } from "@shared/types.js";
import { SmsPreviewModal } from "../../components/SmsPreviewModal.js";

interface NewRequestProps {
  onNavigate: (route: string) => void;
}

export const NewRequest: React.FC<NewRequestProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const [householdName, setHouseholdName] = useState("");
  const [phone, setPhone] = useState("");
  const [locality, setLocality] = useState<Locality>(LOCALITIES[0]);
  const [landmark, setLandmark] = useState("");
  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [window, setWindow] = useState<TimeWindow>("morning");
  const [items, setItems] = useState<RequestItem[]>([
    { category: "laptop", quantity: 1, hasBattery: true }
  ]);
  const [dataWipedConfirmed, setDataWipedConfirmed] = useState(false);

  // Status & modal states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [smsData, setSmsData] = useState<{
    code: string;
    otp: string;
    smsText: string;
    requestId: string;
  } | null>(null);

  // Check if any items are data bearing (phone, laptop, tablet)
  const hasDataBearing = items.some((it) => DATA_BEARING_CATEGORIES.includes(it.category));
  const estimatedWeight = calculateEstimatedWeightKg(items);

  const handleAddItem = () => {
    if (items.length >= 10) return;
    setItems([...items, { category: "cables_chargers", quantity: 1, hasBattery: false }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof RequestItem, val: unknown) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };

    // Auto toggle hasBattery for battery_loose or electronics
    if (field === "category") {
      const cat = val as ItemCategory;
      if (cat === "battery_loose") {
        setErrorMessage(BATTERY_LOOSE_BLOCK_MESSAGE);
      } else {
        setErrorMessage(null);
      }
      if (cat === "laptop" || cat === "phone" || cat === "tablet") {
        updated[index].hasBattery = true;
      }
    }

    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    const hasLooseBattery = items.some((it) => it.category === "battery_loose");
    if (hasLooseBattery) {
      setErrorMessage(BATTERY_LOOSE_BLOCK_MESSAGE);
      return;
    }

    if (hasDataBearing && !dataWipedConfirmed) {
      setErrorMessage(
        "Please check the data wipe confirmation box for phones, laptops, or tablets."
      );
      return;
    }

    if (!householdName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createRequest({
        householdName,
        phone,
        locality,
        landmark,
        pickupDate,
        window,
        items,
        dataWipedConfirmed
      });

      setSmsData({
        code: res.request.code,
        otp: res.pickupOtp,
        smsText: res.smsPreview,
        requestId: res.request.id
      });
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to submit request.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-container">
      {smsData && (
        <SmsPreviewModal
          code={smsData.code}
          otp={smsData.otp}
          smsText={smsData.smsText}
          onClose={() => setSmsData(null)}
          onTrack={() => {
            const lastFour = phone.slice(-4);
            onNavigate(`/household/track?code=${smsData.code}&lastFour=${lastFour}`);
          }}
        />
      )}

      <div className="page-title-box">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-pink">★ DOORSTEP PICKUP ★</span>
          <span className="kitsch-sticker kitsch-sticker-yellow">NO HIDDEN FEES</span>
        </div>
        <h1 className="page-title">{t("household.title")}</h1>
        <p className="page-subtitle">🛵 Instant Doorstep Scrap Collection & Paper Trail 📜</p>
      </div>

      {errorMessage && (
        <div
          style={{
            background: "#ffe4e6",
            border: "3px solid #e11d48",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            color: "#881337",
            fontSize: "0.9rem",
            fontFamily: "var(--font-kitsch-fun)",
            fontWeight: 800,
            boxShadow: "4px 4px 0px var(--kitsch-black)"
          }}
        >
          🚨 <strong>ALERT:</strong> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="responsive-two-col">
          {/* Column 1: Contact Info & Schedule */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Contact Info Card */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.1rem" }}>
                  👤 Citizen Contact Details
                </span>
                <span className="kitsch-sticker kitsch-sticker-cyan" style={{ fontSize: "0.62rem" }}>
                  STEP 1
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">{t("household.name")} *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("household.phone")} *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile (e.g. 9876543210)"
                />
                <span className="form-help">{t("household.phoneHelp")}</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t("household.locality")} *</label>
                <select
                  className="form-select"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value as Locality)}
                >
                  {LOCALITIES.map((loc) => (
                    <option key={loc} value={loc}>
                      📍 {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t("household.landmark")}</label>
                <input
                  type="text"
                  maxLength={200}
                  className="form-input"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Community Center, Pocket 1"
                />
                <span className="form-help">{t("household.landmarkHelp")}</span>
              </div>
            </div>

            {/* Schedule Card */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.1rem" }}>
                  📅 Schedule Your Date
                </span>
                <span className="kitsch-sticker kitsch-sticker-pink" style={{ fontSize: "0.62rem" }}>
                  STEP 2
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">{t("household.pickupDate")} *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("household.timeWindow")} *</label>
                <select
                  className="form-select"
                  value={window}
                  onChange={(e) => setWindow(e.target.value as TimeWindow)}
                >
                  {TIME_WINDOWS.map((win) => (
                    <option key={win} value={win}>
                      ⏰ {TIME_WINDOW_LABELS[win]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Column 2: Items, Data Wipe & Submit */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* E-Waste Items Card */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.1rem" }}>
                  📦 {t("household.itemsTitle")} ({items.length}/10)
                </span>
                <span className="kitsch-sticker kitsch-sticker-green" style={{ fontSize: "0.75rem" }}>
                  ⚖️ Est: {estimatedWeight} kg
                </span>
              </div>

              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#fffdf0",
                    border: "2px solid var(--kitsch-black)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    marginBottom: "12px",
                    boxShadow: "3px 3px 0px var(--kitsch-black)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span className="kitsch-sticker kitsch-sticker-yellow" style={{ fontSize: "0.68rem" }}>
                      ITEM #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: "#ffe4e6",
                          border: "2px solid #e11d48",
                          color: "#e11d48",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontFamily: "var(--font-kitsch-fun)"
                        }}
                      >
                        🗑️ {t("household.removeItem")}
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "10px" }}>
                    <div>
                      <select
                        className="form-select"
                        value={item.category}
                        onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                      >
                        {ITEM_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat === "battery_loose" ? "⚠️ Loose Battery (Blocked)" : `📦 ${cat.replace("_", " ").toUpperCase()}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <label className="form-checkbox-row" style={{ fontSize: "0.85rem", color: "var(--kitsch-black)" }}>
                    <input
                      type="checkbox"
                      checked={item.hasBattery}
                      onChange={(e) => handleItemChange(idx, "hasBattery", e.target.checked)}
                    />
                    <span>🔋 {t("household.hasBattery")}</span>
                  </label>
                </div>
              ))}

              {items.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn btn-secondary btn-block"
                  style={{ padding: "10px", fontSize: "0.95rem", marginTop: "4px" }}
                >
                  ➕ {t("household.addItem")}
                </button>
              )}
            </div>

            {/* Data Wipe Notice if Applicable */}
            {hasDataBearing && (
              <div
                className="card"
                style={{
                  borderLeft: "8px solid var(--kitsch-gold)",
                  background: "#fffbeb"
                }}
              >
                <div style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.05rem", color: "#b45309", marginBottom: "6px" }}>
                  🔒 {t("household.dataWipeTitle")}
                </div>
                <label className="form-checkbox-row" style={{ fontSize: "0.85rem", color: "#78350f" }}>
                  <input
                    type="checkbox"
                    required
                    checked={dataWipedConfirmed}
                    onChange={(e) => setDataWipedConfirmed(e.target.checked)}
                  />
                  <span>{t("household.dataWipeCheck")}</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-block"
              style={{ fontSize: "1.2rem", padding: "18px" }}
            >
              {submitting ? t("household.submitting") : `⚡ ${t("household.submit")} 🪩`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
