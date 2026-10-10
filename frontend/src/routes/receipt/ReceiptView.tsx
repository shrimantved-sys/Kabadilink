import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/LanguageContext.js";
import { api } from "../../api/index.js";
import type { ReceiptSnapshot } from "@shared/types.js";
import { QrCodeView } from "../../components/QrCodeView.js";

interface ReceiptViewProps {
  receiptId: string;
  onNavigate: (route: string) => void;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({ receiptId, onNavigate }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadReceipt = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await api.getReceipt(receiptId);
        setReceipt(res.receipt);
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || "Receipt not found.");
      } finally {
        setLoading(false);
      }
    };
    loadReceipt();
  }, [receiptId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="main-container" style={{ textAlign: "center", padding: "40px" }}>Loading receipt...</div>;
  }

  if (!receipt) {
    return (
      <div className="main-container">
        <div className="card" style={{ textAlign: "center", color: "#fda4af" }}>
          {errorMsg || "Receipt not found."}
        </div>
      </div>
    );
  }

  // Verification URL points to /verify/:receiptId
  const origin = window.location.origin;
  const verifyUrl = `${origin}#/verify/${receipt.receiptId}`;

  const formattedDate = new Date(receipt.issuedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return (
    <div className="main-container">
      {/* Action Header (Hidden in Print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "680px", margin: "0 auto", width: "100%" }}>
        <button onClick={() => onNavigate("/")} className="btn-lang">
          👈 {t("nav.home")}
        </button>
        <button onClick={handlePrint} className="btn btn-accent-yellow" style={{ padding: "8px 18px", minHeight: "42px", fontSize: "0.95rem" }}>
          🖨️ {t("receipt.print")}
        </button>
      </div>

      {/* Printable Receipt Paper */}
      <div className="receipt-paper-container">
        <div className="receipt-paper">
        <div className="receipt-header">
          <div style={{ fontSize: "2.4rem", marginBottom: "4px" }}>🪩</div>
          <h1 className="receipt-title">{t("appName")}</h1>
          <div className="receipt-subtitle">★ OFFICIAL PROTOTYPE SALES PROOF VOUCHER ★</div>
          <div className="receipt-code-badge">
            RECEIPT: <strong>{receipt.receiptId}</strong>
          </div>
        </div>

        {/* Essential Info Grid */}
        <div className="receipt-grid">
          <div>
            <div className="receipt-field-label">{t("receipt.requestCode")}</div>
            <div className="receipt-field-value" style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.1rem" }}>
              {receipt.requestCode}
            </div>
          </div>
          <div>
            <div className="receipt-field-label">{t("receipt.date")}</div>
            <div className="receipt-field-value">{formattedDate}</div>
          </div>
          <div>
            <div className="receipt-field-label">{t("receipt.household")}</div>
            <div className="receipt-field-value">{receipt.householdFirstName}</div>
          </div>
          <div>
            <div className="receipt-field-label">{t("receipt.phone")}</div>
            <div className="receipt-field-value" style={{ fontFamily: "var(--font-kitsch-mono)", fontSize: "1.05rem" }}>
              {receipt.maskedPhone}
            </div>
          </div>
          <div>
            <div className="receipt-field-label">{t("receipt.locality")}</div>
            <div className="receipt-field-value">{receipt.locality}</div>
          </div>
          <div>
            <div className="receipt-field-label">{t("receipt.actualWeight")}</div>
            <div className="receipt-field-value" style={{ fontWeight: 800, color: "#15803d", fontSize: "1.1rem" }}>
              ⚖️ {receipt.actualWeightKg} kg
            </div>
          </div>
        </div>

        {/* Collector & Recycler Identification */}
        <div style={{ background: "#fffdf0", padding: "12px", borderRadius: "10px", marginBottom: "16px", border: "2px solid var(--kitsch-black)", boxShadow: "3px 3px 0px var(--kitsch-black)" }}>
          <div style={{ marginBottom: "6px", fontFamily: "var(--font-kitsch-fun)" }}>
            <span className="receipt-field-label">{t("receipt.collector")}: </span>
            <strong style={{ color: "var(--kitsch-black)" }}>🛵 {receipt.collectorName}</strong>
          </div>
          <div style={{ fontFamily: "var(--font-kitsch-fun)" }}>
            <span className="receipt-field-label">{t("receipt.recycler")}: </span>
            <strong style={{ color: "var(--kitsch-black)" }}>🏭 {receipt.recyclerName}</strong>
            <div style={{ fontSize: "0.75rem", color: "#6b21a8", marginTop: "2px" }}>
              Reg No: <span style={{ fontFamily: "var(--font-kitsch-mono)", fontWeight: 700 }}>{receipt.recyclerRegNo}</span> (SAMPLE)
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: "16px" }}>
          <div className="receipt-field-label" style={{ marginBottom: "6px" }}>
            {t("receipt.items")}
          </div>
          <table className="receipt-items-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Qty</th>
                <th>Battery</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700 }}>📦 {it.category.replace("_", " ").toUpperCase()}</td>
                  <td style={{ fontWeight: 800 }}>{it.quantity}</td>
                  <td>{it.hasBattery ? "🔋 Built-in" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* QR Code & Verify Link */}
        <div className="receipt-qr-box">
          <QrCodeView value={verifyUrl} size={100} />
          <div>
            <div style={{ fontFamily: "var(--font-kitsch-title)", fontSize: "1.05rem", color: "var(--kitsch-black)" }}>
              {t("receipt.verifyOnline")}
            </div>
            <div style={{ fontFamily: "var(--font-kitsch-comic)", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginTop: "2px" }}>
              {t("receipt.qrHelp")}
            </div>
            <button
              onClick={() => onNavigate(`/verify/${receipt.receiptId}`)}
              className="no-print"
              style={{
                marginTop: "8px",
                background: "var(--kitsch-electricyellow)",
                border: "2px solid var(--kitsch-black)",
                color: "var(--kitsch-black)",
                fontWeight: 800,
                fontSize: "0.78rem",
                fontFamily: "var(--font-kitsch-fun)",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "6px",
                boxShadow: "2px 2px 0px var(--kitsch-black)"
              }}
            >
              🛡️ Verify Online Now →
            </button>
          </div>
        </div>

        {/* Fingerprint Display */}
        <div className="receipt-fingerprint-box">
          <div className="receipt-fingerprint-label">{t("receipt.fingerprint")}</div>
          <div className="receipt-fingerprint-code">{receipt.shortCode}</div>
          <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-kitsch-mono)", color: "var(--kitsch-cyan)", marginTop: "4px", wordBreak: "break-all" }}>
            SHA-256: {receipt.canonicalFingerprint}
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="receipt-footer-disclaimer">
          ✨ {receipt.disclaimer || t("receipt.disclaimer")} ✨
          <div style={{ marginTop: "4px", fontSize: "0.7rem", color: "var(--kitsch-hotpink)", fontFamily: "var(--font-kitsch-display)" }}>
            THANK YOU FOR SAVING MOTHER EARTH! 🌍💖
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
