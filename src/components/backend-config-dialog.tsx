"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { normalizeBackendUrl, getBackendUrl, setBackendUrl } from "@/lib/backend";
import { checkBackendHealth, type HealthCheckResult } from "@/lib/health";

interface BackendConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackendConfigDialog({ open, onOpenChange }: BackendConfigDialogProps) {
  const [url, setUrl] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<HealthCheckResult | null>(null);

  React.useEffect(() => {
    if (open) {
      setUrl(getBackendUrl());
      setTestResult(null);
    }
  }, [open]);

  async function handleTest() {
    if (!url.trim()) {
      toast.error("Please enter a backend URL");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const normalized = normalizeBackendUrl(url);
      const result = await checkBackendHealth(normalized);
      setTestResult(result);

      if (result.ok) {
        toast.success("Connection successful");
      } else {
        toast.error("Connection failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid URL");
      setTestResult({
        ok: false,
        latency: 0,
        message: err instanceof Error ? err.message : "Invalid URL",
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    try {
      const normalized = normalizeBackendUrl(url);
      setBackendUrl(normalized);
      toast.success("Backend URL saved");
      onOpenChange(false);

      // Reload to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid URL");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Backend</DialogTitle>
          <DialogDescription>
            Set the backend server URL and test the connection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="backend-url">Backend URL</Label>
            <Input
              id="backend-url"
              placeholder="http://localhost:3000"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !testing) {
                  e.preventDefault();
                  handleTest();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              The app calls this backend URL directly from your browser
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-3 ${testResult.ok
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                }`}
            >
              <div className="flex items-start gap-3">
                {testResult.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {testResult.ok ? "Connection successful" : "Connection failed"}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {testResult.latency}ms
                    </Badge>
                  </div>
                  {!testResult.ok && (
                    <p className="text-xs text-muted-foreground">{testResult.message}</p>
                  )}
                  {testResult.ok && testResult.data && (
                    <div className="flex gap-2 text-xs">
                      {testResult.data.status && (
                        <Badge variant="secondary" className="text-xs">
                          Status: {testResult.data.status}
                        </Badge>
                      )}
                      {testResult.data.db && (
                        <Badge variant="secondary" className="text-xs">
                          DB: {testResult.data.db}
                        </Badge>
                      )}
                      {testResult.data.minio && (
                        <Badge variant="secondary" className="text-xs">
                          MinIO: {testResult.data.minio}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="w-full sm:w-auto"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!testResult?.ok}
              className="flex-1 sm:flex-none"
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
