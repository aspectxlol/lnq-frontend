"use client";

import * as React from "react";
import { Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendConfigDialog } from "@/components/backend-config-dialog";
import { getBackendUrl } from "@/lib/backend";
import { useHealthCheck } from "@/lib/health-provider";
import { styles } from "@/lib/styles";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [currentUrl, setCurrentUrl] = React.useState("");
  const { isHealthy, lastCheck, isChecking } = useHealthCheck();

  React.useEffect(() => {
    setCurrentUrl(getBackendUrl());
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Configure application settings and preferences.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Backend Server
          </CardTitle>
          <CardDescription>
            Configure the backend server URL and monitor connection status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="text-sm font-medium">Current Backend URL</div>
              <div className="text-sm text-muted-foreground font-mono break-all">
                {currentUrl}
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} variant="outline">
              Configure
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Status</span>
              <Badge variant={isHealthy ? "default" : "destructive"}>
                {isChecking ? "Checking..." : isHealthy ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            {lastCheck && (
              <div className="text-xs text-muted-foreground">
                Last checked: {new Date(lastCheck).toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <BackendConfigDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </main>
  );
}
