import React from "react";
import { useTranslation } from "../i18n/LanguageContext.js";

interface RoleChooserProps {
  onNavigate: (route: string) => void;
}

export const RoleChooser: React.FC<RoleChooserProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div className="main-container">
      {/* Retro Infomercial Banner Box */}
      <div className="page-title-box">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span className="kitsch-sticker kitsch-sticker-pink">★ AS SEEN IN INDIA ★</span>
          <span className="kitsch-sticker kitsch-sticker-yellow">100% LEGAL SCRAP</span>
        </div>
        <h1 className="page-title">{t("roles.title")}</h1>
        <p className="page-subtitle">✨ {t("appTagline")} ✨</p>
      </div>

      <div className="role-grid">
        {/* Household Card */}
        <div
          onClick={() => onNavigate("/household/new")}
          className="role-card card-interactive"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #fff0f7 100%)",
            borderLeft: "8px solid var(--kitsch-hotpink)"
          }}
        >
          <div
            className="role-icon-box"
            style={{ background: "linear-gradient(180deg, #ff99cc 0%, #ff007f 100%)", color: "#ffffff" }}
          >
            🏠
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="role-title">{t("roles.household")}</div>
              <span className="starburst-badge">HOT!</span>
            </div>
            <div className="role-desc">{t("roles.householdDesc")}</div>
            <div style={{ marginTop: "6px" }}>
              <span className="kitsch-sticker kitsch-sticker-yellow" style={{ fontSize: "0.62rem" }}>
                ⚡ FREE PICKUP AT YOUR DOOR
              </span>
            </div>
          </div>
        </div>

        {/* Track Request Direct Link */}
        <div
          onClick={() => onNavigate("/household/track")}
          className="role-card card-interactive"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
            borderLeft: "8px solid var(--kitsch-cyan)"
          }}
        >
          <div
            className="role-icon-box"
            style={{ background: "linear-gradient(180deg, #67e8f9 0%, #00f0ff 100%)", color: "#111116" }}
          >
            🔍
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="role-title">{t("household.trackTitle")}</div>
              <span className="kitsch-sticker kitsch-sticker-cyan" style={{ fontSize: "0.65rem" }}>
                LIVE RADAR
              </span>
            </div>
            <div className="role-desc">Enter code + last 4 phone digits to check pickup status & receipt</div>
          </div>
        </div>

        {/* Collector Card */}
        <div
          onClick={() => onNavigate("/collector")}
          className="role-card card-interactive"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #fefce8 100%)",
            borderLeft: "8px solid var(--kitsch-gold)"
          }}
        >
          <div
            className="role-icon-box"
            style={{ background: "linear-gradient(180deg, #fde047 0%, #ffbe0b 100%)", color: "#111116" }}
          >
            🛵
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="role-title">{t("roles.collector")}</span>
              <span className="kitsch-sticker kitsch-sticker-pink" style={{ fontSize: "0.62rem" }}>
                ₹ CASH DISPATCH
              </span>
            </div>
            <div className="role-desc">{t("roles.collectorDesc")}</div>
          </div>
        </div>

        {/* Verify Receipt Card */}
        <div
          onClick={() => onNavigate("/verify")}
          className="role-card card-interactive"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)",
            borderLeft: "8px solid var(--kitsch-electricpurple)"
          }}
        >
          <div
            className="role-icon-box"
            style={{ background: "linear-gradient(180deg, #c084fc 0%, #8338ec 100%)", color: "#ffffff" }}
          >
            🛡️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="role-title">{t("roles.verify")}</div>
              <span className="kitsch-sticker kitsch-sticker-green" style={{ fontSize: "0.65rem" }}>
                ANTI-TAMPER
              </span>
            </div>
            <div className="role-desc">{t("roles.verifyDesc")}</div>
          </div>
        </div>

        {/* Demo Panel Card */}
        <div
          onClick={() => onNavigate("/demo")}
          className="role-card card-interactive"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
            borderLeft: "8px solid var(--kitsch-acidgreen)"
          }}
        >
          <div
            className="role-icon-box"
            style={{ background: "linear-gradient(180deg, #86efac 0%, #39ff14 100%)", color: "#111116" }}
          >
            ⚙️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="role-title">{t("roles.demo")}</div>
              <span className="kitsch-sticker kitsch-sticker-gold" style={{ fontSize: "0.62rem" }}>
                ★ GOD MODE ★
              </span>
            </div>
            <div className="role-desc">{t("roles.demoDesc")}</div>
          </div>
        </div>
      </div>

      {/* Campy Footer Box */}
      <div
        style={{
          marginTop: "auto",
          padding: "12px",
          background: "#ffffff",
          border: "3px dashed var(--kitsch-black)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.78rem",
          fontFamily: "var(--font-kitsch-comic)",
          fontWeight: 700,
          color: "#3b0764",
          textAlign: "center",
          boxShadow: "3px 3px 0px var(--kitsch-black)"
        }}
      >
        ✂️ CUT HERE TO RECYCLE • OFFICIAL PROTOTYPE UNDER INDIA'S E-WASTE RULES 2022 ✂️
      </div>
    </div>
  );
};

