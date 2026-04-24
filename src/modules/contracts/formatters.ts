import { type Decimal } from "@prisma/client/runtime/library";

export function formatContractDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "Não informada";
}

export function formatContractDateTime(date: Date | null | undefined) {
  return date
    ? date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não informado";
}

export function formatDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function formatCurrencyValue(value: Decimal | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  const numericValue = typeof value === "number" ? value : Number(String(value));

  if (Number.isNaN(numericValue)) {
    return "Não informado";
  }

  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getDaysUntil(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

