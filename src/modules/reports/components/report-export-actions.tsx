"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type ReportExportActionsProps = {
  excelHref: string;
  pdfHref: string;
};

function getFileNameFromDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}

async function downloadFile(href: string) {
  const response = await fetch(href, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    let message = "Não foi possível exportar o relatório.";

    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {}

    throw new Error(message);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const fileName = getFileNameFromDisposition(response.headers.get("content-disposition")) ?? "relatorio";
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function ReportExportActions({ excelHref, pdfHref }: ReportExportActionsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFormat, setPendingFormat] = useState<"xlsx" | "pdf" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExport(format: "xlsx" | "pdf", href: string) {
    setErrorMessage(null);
    setPendingFormat(format);

    startTransition(async () => {
      try {
        await downloadFile(href);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível exportar o relatório.");
      } finally {
        setPendingFormat(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => handleExport("xlsx", excelHref)}
        >
          {pendingFormat === "xlsx" ? "Exportando Excel..." : "Exportar Excel"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => handleExport("pdf", pdfHref)}
        >
          {pendingFormat === "pdf" ? "Exportando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
    </div>
  );
}
