import React from "react";
import type { RequestStatus } from "@shared/types.js";
import { useTranslation } from "../i18n/LanguageContext.js";

interface StatusBadgeProps {
  status: RequestStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();

  const getStatusClass = (s: RequestStatus) => {
    switch (s) {
      case "REQUESTED":
        return "badge-requested";
      case "ACCEPTED":
        return "badge-accepted";
      case "PICKED_UP":
        return "badge-picked_up";
      case "HANDED_TO_RECYCLER":
        return "badge-handed_to_recycler";
      case "RECEIVED_BY_RECYCLER":
        return "badge-received_by_recycler";
      case "CANCELLED":
        return "badge-cancelled";
      default:
        return "";
    }
  };

  const getStatusIcon = (s: RequestStatus) => {
    switch (s) {
      case "REQUESTED":
        return "⏱";
      case "ACCEPTED":
        return "🚚";
      case "PICKED_UP":
        return "⚖️";
      case "HANDED_TO_RECYCLER":
        return "🏭";
      case "RECEIVED_BY_RECYCLER":
        return "✅";
      case "CANCELLED":
        return "❌";
      default:
        return "•";
    }
  };

  return (
    <span className={`badge ${getStatusClass(status)}`}>
      <span>{getStatusIcon(status)}</span>
      <span>{t(`status.${status}`)}</span>
    </span>
  );
};
