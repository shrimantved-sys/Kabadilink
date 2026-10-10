import React from "react";
import { useTranslation } from "../i18n/LanguageContext.js";
import { isMockMode } from "../api/index.js";

interface HeaderProps {
  onNavigateHome: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  currentPath?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  showBack,
  onBack,
  onNavigate,
  currentPath = "/"
}) => {
  const { lang, toggleLang, t } = useTranslation();

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button
            onClick={onBack}
            className="btn-lang btn-back-mobile"
            title={t("nav.back")}
          >
            👈
          </button>
        )}
        <div
          onClick={onNavigateHome}
          className="brand-link"
          style={{ cursor: "pointer" }}
        >
          <div className="brand-logo-badge">🪩</div>
          <div>
            <div className="brand-title">{t("appName")}</div>
            <div className="brand-subtitle">
              ★ E-WASTE BONANZA ★
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Quick Nav Bar */}
      {onNavigate && (
        <nav className="desktop-nav">
          <button
            onClick={() => onNavigate("/")}
            className={`desktop-nav-link ${currentPath === "/" ? "active" : ""}`}
          >
            🏠 Home
          </button>
          <button
            onClick={() => onNavigate("/household/new")}
            className={`desktop-nav-link ${currentPath === "/household/new" ? "active" : ""}`}
          >
            📦 Pickup
          </button>
          <button
            onClick={() => onNavigate("/household/track")}
            className={`desktop-nav-link ${currentPath.startsWith("/household/track") ? "active" : ""}`}
          >
            🔍 Track
          </button>
          <button
            onClick={() => onNavigate("/collector")}
            className={`desktop-nav-link ${currentPath.startsWith("/collector") ? "active" : ""}`}
          >
            🛵 Dispatch
          </button>
          <button
            onClick={() => onNavigate("/verify")}
            className={`desktop-nav-link ${currentPath.startsWith("/verify") ? "active" : ""}`}
          >
            🛡️ Verify
          </button>
          <button
            onClick={() => onNavigate("/demo")}
            className={`desktop-nav-link ${currentPath === "/demo" ? "active" : ""}`}
          >
            ⚙️ Lab
          </button>
        </nav>
      )}

      <div className="header-actions">
        {isMockMode && (
          <span className="kitsch-sticker kitsch-sticker-green" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
            ✨ MOCK
          </span>
        )}
        <button onClick={toggleLang} className="btn-lang">
          {lang === "en" ? "🇮🇳 हिंदी" : "🇬🇧 Eng"}
        </button>
      </div>
    </header>
  );
};


