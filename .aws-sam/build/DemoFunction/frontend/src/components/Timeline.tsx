import React from "react";
import type { RequestEvent, RequestStatus } from "@shared/types.js";
import { useTranslation } from "../i18n/LanguageContext.js";

interface TimelineProps {
  events: RequestEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const { t } = useTranslation();

  if (!events || events.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No events recorded yet.</div>;
  }

  return (
    <div className="timeline">
      {events.map((evt, idx) => {
        const dateStr = new Date(evt.timestamp).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short"
        });

        const statusKey = evt.toStatus || evt.fromStatus || "REQUESTED";

        return (
          <div key={idx} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="timeline-status">
                  {t(`status.${statusKey as RequestStatus}`, statusKey)}
                </span>
                <span className="timeline-time">{dateStr}</span>
              </div>
              <p className="timeline-note">{evt.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
