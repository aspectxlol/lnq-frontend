"use client";

import * as React from "react";
import { toast } from "sonner";
import { checkBackendHealth } from "@/lib/health";

interface HealthCheckContextValue {
  isHealthy: boolean;
  isChecking: boolean;
  lastCheck: number | null;
  recheckHealth: () => Promise<void>;
}

const HealthCheckContext = React.createContext<HealthCheckContextValue | null>(null);

export function HealthCheckProvider({ children }: { children: React.ReactNode }) {
  const [isHealthy, setIsHealthy] = React.useState(true);
  const [isChecking, setIsChecking] = React.useState(false);
  const [lastCheck, setLastCheck] = React.useState<number | null>(null);
  const hasShownErrorRef = React.useRef(false);

  const checkHealth = React.useCallback(async (showToast = true) => {
    setIsChecking(true);

    const result = await checkBackendHealth();
    setIsHealthy(result.ok);
    setLastCheck(Date.now());
    setIsChecking(false);

    if (!result.ok && showToast && !hasShownErrorRef.current) {
      toast.error("Backend connection failed", {
        description: `${result.message}. Check your backend URL in settings.`,
        duration: 5000,
      });
      hasShownErrorRef.current = true;
    } else if (result.ok && hasShownErrorRef.current) {
      toast.success("Backend connection restored");
      hasShownErrorRef.current = false;
    }

    return result;
  }, []);

  // Check health on mount and when backend URL changes
  React.useEffect(() => {
    checkHealth(true);
  }, [checkHealth]);

  // Listen for storage events (backend URL changes in other tabs)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "backendUrl") {
        checkHealth(true);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkHealth]);

  const recheckHealth = React.useCallback(async () => {
    await checkHealth(true);
  }, [checkHealth]);

  return (
    <HealthCheckContext.Provider
      value={{ isHealthy, isChecking, lastCheck, recheckHealth }}
    >
      {children}
    </HealthCheckContext.Provider>
  );
}

export function useHealthCheck() {
  const context = React.useContext(HealthCheckContext);
  if (!context) {
    throw new Error("useHealthCheck must be used within HealthCheckProvider");
  }
  return context;
}
