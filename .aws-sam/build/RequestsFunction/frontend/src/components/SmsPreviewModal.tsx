import React from "react";
import { useTranslation } from "../i18n/LanguageContext.js";

interface SmsPreviewModalProps {
  code: string;
  otp: string;
  smsText: string;
  onClose: () => void;
  onTrack: () => void;
}

export const SmsPreviewModal: React.FC<SmsPreviewModalProps> = ({
  code,
  otp,
  smsText,
  onClose,
  onTrack
}) => {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop">
      <div className="sms-phone-frame">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>
            📱 SMS Notification Preview
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              background: "#10b981",
              color: "#022c22",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: 800
            }}
          >
            SIMULATED
          </span>
        </div>

        <div className="sms-bubble">
          <p style={{ marginBottom: "8px" }}>{smsText}</p>
          <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Your Request Code:</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
              {code}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "6px" }}>
              Your Pickup OTP:
            </div>
            <div className="sms-otp-highlight">{otp}</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "4px" }}>
              🔒 Share this 4-digit OTP ONLY with the scrap collector after e-waste inspection.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onTrack} className="btn btn-primary btn-block">
            {t("household.trackButton")} →
          </button>
          <button onClick={onClose} className="btn btn-secondary btn-block">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
