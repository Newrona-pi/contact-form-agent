"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { isFreeEmailDomain } from "@/lib/zodSchemas";

interface WarningFreeMailProps {
  email: string;
}

export function WarningFreeMail({ email }: WarningFreeMailProps) {
  if (!email || !isFreeEmailDomain(email)) {
    return null;
  }

  return (
    <Alert variant="warning" className="mt-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        フリーメールアドレスが検出されました。法人利用の場合は、会社のメールアドレスをご利用ください。
      </AlertDescription>
    </Alert>
  );
}
