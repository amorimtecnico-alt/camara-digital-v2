"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function ReportSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Preparando..." : "Preparar relatório"}
    </Button>
  );
}
