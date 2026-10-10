import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrCodeViewProps {
  value: string;
  size?: number;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({ value, size = 110 }) => {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "#f1f5f9",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          color: "#94a3b8"
        }}
      >
        QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Verification QR Code"
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        display: "block"
      }}
    />
  );
};
