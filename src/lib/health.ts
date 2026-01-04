import { buildBackendUrl } from "@/lib/backend";

export interface HealthCheckResult {
  ok: boolean;
  latency: number;
  message: string;
  data?: {
    status?: string;
    db?: string;
    minio?: string;
  };
}

export async function checkBackendHealth(url?: string): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    const healthUrl = url ? `${url}/health` : buildBackendUrl("/health");
    const res = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const latency = Math.round(performance.now() - start);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        latency,
        message: text || `HTTP ${res.status}`,
      };
    }

    const data = await res.json().catch(() => ({}));

    return {
      ok: true,
      latency,
      message: "Connected",
      data,
    };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return {
      ok: false,
      latency,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
