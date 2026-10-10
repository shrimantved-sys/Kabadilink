import React, { useState, useEffect } from "react";
import { LanguageProvider } from "./i18n/LanguageContext.js";
import { PrototypeBanner } from "./components/PrototypeBanner.js";
import { Header } from "./components/Header.js";
import { RoleChooser } from "./routes/RoleChooser.js";
import { NewRequest } from "./routes/household/NewRequest.js";
import { TrackRequest } from "./routes/household/TrackRequest.js";
import { CollectorHome } from "./routes/collector/CollectorHome.js";
import { PickupScreen } from "./routes/collector/PickupScreen.js";
import { HandoverScreen } from "./routes/collector/HandoverScreen.js";
import { ReceiptView } from "./routes/receipt/ReceiptView.js";
import { VerifyView } from "./routes/verify/VerifyView.js";
import { DemoPanel } from "./routes/demo/DemoPanel.js";

export function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, "");
    return hash || "/";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      setCurrentRoute(hash || "/");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Route matching & query extraction
  const [path, queryString] = currentRoute.split("?");
  const queryParams = new URLSearchParams(queryString || "");

  const renderRoute = () => {
    // 1. Home / Role Chooser
    if (path === "/" || path === "") {
      return <RoleChooser onNavigate={navigate} />;
    }

    // 2. Household New Request
    if (path === "/household/new") {
      return <NewRequest onNavigate={navigate} />;
    }

    // 3. Household Track Request
    if (path === "/household/track") {
      return (
        <TrackRequest
          initialCode={queryParams.get("code") || ""}
          initialLastFour={queryParams.get("lastFour") || ""}
          onNavigate={navigate}
        />
      );
    }

    // 4. Collector Home
    if (path === "/collector") {
      return <CollectorHome onNavigate={navigate} />;
    }

    // 5. Collector Pickup Screen (/collector/pickup/:id)
    const pickupMatch = path.match(/^\/collector\/pickup\/([^/]+)$/);
    if (pickupMatch) {
      return <PickupScreen requestId={pickupMatch[1]} onNavigate={navigate} />;
    }

    // 6. Collector Handover Screen (/collector/handover/:id)
    const handoverMatch = path.match(/^\/collector\/handover\/([^/]+)$/);
    if (handoverMatch) {
      return <HandoverScreen requestId={handoverMatch[1]} onNavigate={navigate} />;
    }

    // 7. Receipt View (/receipt/:id)
    const receiptMatch = path.match(/^\/receipt\/([^/]+)$/);
    if (receiptMatch) {
      return <ReceiptView receiptId={receiptMatch[1]} onNavigate={navigate} />;
    }

    // 8. Verify View (/verify or /verify/:id)
    const verifyMatch = path.match(/^\/verify(?:\/([^/]+))?$/);
    if (verifyMatch) {
      return <VerifyView receiptId={verifyMatch[1] || ""} onNavigate={navigate} />;
    }

    // 9. Demo Panel (/demo)
    if (path === "/demo") {
      return <DemoPanel onNavigate={navigate} />;
    }

    // Fallback to Role Chooser
    return <RoleChooser onNavigate={navigate} />;
  };

  const isHome = path === "/" || path === "";

  return (
    <>
      <PrototypeBanner />
      <Header
        onNavigateHome={() => navigate("/")}
        showBack={!isHome}
        onBack={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            navigate("/");
          }
        }}
        onNavigate={navigate}
        currentPath={path}
      />
      {renderRoute()}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
