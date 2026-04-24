import { NextResponse } from "next/server";
import type { PDFFont, PDFPage, rgb as rgbType } from "pdf-lib";

import type { SearchParamsRecord } from "@/lib/list-navigation";
import type { PreparedReportData } from "@/modules/reports/export";
import type { ReportsUser } from "@/modules/reports/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResolvedReport = NonNullable<PreparedReportData>;
type DrawTextColor = ReturnType<typeof rgbType>;

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value.padEnd(maxLength, " ");
  }

  if (maxLength <= 1) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, Math.max(maxLength - 3, 0))}...`;
}

function buildColumnWidths(headers: string[], rows: string[][]) {
  return headers.map((header, index) => {
    const contentLength = Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length));
    return Math.min(Math.max(contentLength + 2, 14), 40);
  });
}

async function buildExcelBuffer(report: ResolvedReport) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");

  sheet.addRow([report.title]);
  sheet.addRow([`Gerado em: ${report.generatedAtLabel}`]);
  sheet.addRow([`Total de registros: ${report.totalRecords}`]);

  if (report.filtersSummary.length > 0) {
    sheet.addRow(["Filtros aplicados"]);

    for (const filter of report.filtersSummary) {
      sheet.addRow([filter.label, filter.value]);
    }
  }

  sheet.addRow([]);
  const headerRow = sheet.addRow(report.headers);

  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2A44" },
  };

  for (const row of report.rows) {
    sheet.addRow(row);
  }

  const widths = buildColumnWidths(report.headers, report.rows);
  sheet.columns = widths.map((width) => ({ width }));
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildTableLines(report: ResolvedReport) {
  const widths = buildColumnWidths(report.headers, report.rows).map((width) => Math.min(width, 22));
  const separator = widths.map((width) => "-".repeat(width)).join("-+-");
  const headerLine = report.headers.map((header, index) => clampText(header, widths[index]!)).join(" | ");
  const dataLines = report.rows.map((row) =>
    row.map((cell, index) => clampText(cell, widths[index]!)).join(" | "),
  );

  return [headerLine, separator, ...dataLines];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: {
    font: PDFFont;
    size: number;
    x: number;
    y: number;
    lineHeight: number;
    color: DrawTextColor;
  },
) {
  let currentY = options.y;

  for (const line of text.split("\n")) {
    page.drawText(line, {
      x: options.x,
      y: currentY,
      size: options.size,
      font: options.font,
      color: options.color,
    });
    currentY -= options.lineHeight;
  }

  return currentY;
}

async function buildPdfBuffer(report: ResolvedReport) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const pageSize: [number, number] = [842, 595];
  const margin = 36;
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdf.embedFont(StandardFonts.Courier);
  const lines = buildTableLines(report);
  let page = pdf.addPage(pageSize);
  let currentY = page.getHeight() - margin;
  const defaultColor = rgb(0.16, 0.18, 0.22);

  const startNewPage = () => {
    page = pdf.addPage(pageSize);
    currentY = page.getHeight() - margin;
  };

  page.drawText(report.title, {
    x: margin,
    y: currentY,
    size: 18,
    font: titleFont,
    color: rgb(0.06, 0.16, 0.27),
  });
  currentY -= 26;

  currentY = drawWrappedText(page, `Gerado em: ${report.generatedAtLabel}`, {
    font: bodyFont,
    size: 10,
    x: margin,
    y: currentY,
    lineHeight: 14,
    color: defaultColor,
  });
  currentY = drawWrappedText(page, `Total de registros: ${report.totalRecords}`, {
    font: bodyFont,
    size: 10,
    x: margin,
    y: currentY,
    lineHeight: 14,
    color: defaultColor,
  });

  if (report.filtersSummary.length > 0) {
    currentY -= 4;
    currentY = drawWrappedText(page, "Filtros aplicados:", {
      font: titleFont,
      size: 11,
      x: margin,
      y: currentY,
      lineHeight: 15,
      color: defaultColor,
    });

    for (const filter of report.filtersSummary) {
      currentY = drawWrappedText(page, `${filter.label}: ${filter.value}`, {
        font: bodyFont,
        size: 10,
        x: margin + 8,
        y: currentY,
        lineHeight: 14,
        color: defaultColor,
      });
    }
  }

  currentY -= 8;

  for (const line of lines) {
    if (currentY < margin + 18) {
      startNewPage();
    }

    page.drawText(line, {
      x: margin,
      y: currentY,
      size: 8.5,
      font: monoFont,
      color: defaultColor,
    });
    currentY -= 11;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export async function GET(request: Request) {
  const [{ getCurrentUser }, { canAccessRoute }, { getPreparedReportData }] = await Promise.all([
    import("@/lib/auth"),
    import("@/lib/permissions"),
    import("@/modules/reports/export"),
  ]);

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!canAccessRoute(user, "/relatorios")) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format !== "pdf" && format !== "xlsx") {
    return NextResponse.json({ message: "Formato de exportação inválido." }, { status: 400 });
  }

  const paramsRecord = Object.fromEntries(searchParams.entries()) as SearchParamsRecord;
  const report = await getPreparedReportData(user as ReportsUser, paramsRecord);

  if (!report) {
    return NextResponse.json({ message: "Prepare o relatório antes de exportar." }, { status: 400 });
  }

  if (report.totalRecords === 0) {
    return NextResponse.json({ message: "Não há resultados para exportar com os filtros atuais." }, { status: 400 });
  }

  if (format === "xlsx") {
    const buffer = await buildExcelBuffer(report);

    return new NextResponse(buffer, {
      headers: {
        "content-disposition": `attachment; filename="${report.fileBaseName}.xlsx"`,
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }

  const buffer = await buildPdfBuffer(report);

  return new NextResponse(buffer, {
    headers: {
      "content-disposition": `attachment; filename="${report.fileBaseName}.pdf"`,
      "content-type": "application/pdf",
    },
  });
}
