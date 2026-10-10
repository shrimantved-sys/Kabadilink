import React from "react";
import { useTranslation } from "../i18n/LanguageContext.js";

export const PrototypeBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <div className="prototype-banner">
        <span>🚨 ★ <strong>PROTOTYPE EXTRAVAGANZA</strong> ★ {t("prototypeBanner")} ★ 🚨</span>
      </div>
      <div className="kitsch-ticker-tape">
        <div className="kitsch-ticker-inner">
          ⚡ 100% RECYCLED KARMA! 🪩 NO DUMPING! ✨ CASH FOR TRASH! 🛵 TOP RUPEES FOR OLD LAPTOPS! 💾 SAVE THE PLANET BRO! ⚡ 100% RECYCLED KARMA! 🪩 NO DUMPING! ✨ CASH FOR TRASH! 🛵 TOP RUPEES FOR OLD LAPTOPS! 💾 SAVE THE PLANET BRO! &nbsp;
        </div>
      </div>
    </>
  );
};

