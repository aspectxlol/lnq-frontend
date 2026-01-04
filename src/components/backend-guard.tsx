"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendConfigDialog } from "@/components/backend-config-dialog";
import { useHealthCheck } from "@/lib/health-provider";

export function BackendGuard({ children }: { children: React.ReactNode }) {
  const { isHealthy, isChecking, recheckHealth } = useHealthCheck();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Show loading state on initial check
  if (isChecking && isHealthy === true) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  // If backend is not healthy, show error screen
  if (!isHealthy) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[600px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/10 p-2">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Backend Unavailable</CardTitle>
                  <CardDescription className="mt-1">
                    Unable to connect to the backend server
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The application requires a connection to the backend server to function. Please check your backend
                configuration and try again.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => recheckHealth()} disabled={isChecking} className="flex-1">
                  {isChecking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry Connection
                    </>
                  )}
                </Button>
                <Button onClick={() => setDialogOpen(true)} variant="outline" className="flex-1">
                  Configure Backend
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BackendConfigDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  // Backend is healthy, render children
  return <>{children}</>;
}
