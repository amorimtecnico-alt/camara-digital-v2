import "server-only";

import { UserRole } from "@prisma/client";

const ATTACHMENT_CORRECTION_WINDOW_MINUTES = 15;
const ATTACHMENT_CORRECTION_WINDOW_MS = ATTACHMENT_CORRECTION_WINDOW_MINUTES * 60 * 1000;

export function getAttachmentCorrectionDeadline(attachmentUploadedAt: Date) {
  return new Date(attachmentUploadedAt.getTime() + ATTACHMENT_CORRECTION_WINDOW_MS);
}

export function getAttachmentCorrectionStatus(params: {
  attachmentUploadedAt: Date | null | undefined;
  role: UserRole;
}) {
  const { attachmentUploadedAt, role } = params;

  if (!attachmentUploadedAt) {
    return {
      hasAttachment: false,
      isAdmin: role === UserRole.ADMIN,
      withinWindow: true,
      windowExpired: false,
      canModify: true,
      requiresAdminJustification: false,
      deadline: null,
      remainingMinutes: null,
    };
  }

  const isAdmin = role === UserRole.ADMIN;
  const deadline = getAttachmentCorrectionDeadline(attachmentUploadedAt);
  const now = new Date();
  const remainingMs = deadline.getTime() - now.getTime();
  const withinWindow = remainingMs >= 0;
  const remainingMinutes = withinWindow ? Math.ceil(remainingMs / (60 * 1000)) : 0;

  return {
    hasAttachment: true,
    isAdmin,
    withinWindow,
    windowExpired: !withinWindow,
    canModify: isAdmin || withinWindow,
    requiresAdminJustification: isAdmin && !withinWindow,
    deadline,
    remainingMinutes,
  };
}

export function getAttachmentCorrectionMessage(params: {
  attachmentUploadedAt: Date | null | undefined;
  role: UserRole;
}) {
  const status = getAttachmentCorrectionStatus(params);

  if (!status.hasAttachment) {
    return "Nenhum anexo principal foi enviado ainda.";
  }

  if (status.withinWindow) {
    return `Janela de correcao aberta por mais ${status.remainingMinutes} minuto(s).`;
  }

  if (status.requiresAdminJustification) {
    return "Janela expirada. Como ADMIN, voce ainda pode alterar o anexo mediante justificativa obrigatoria.";
  }

  return "Janela de correcao expirada. Apenas ADMIN pode substituir ou excluir o anexo a partir deste momento.";
}

export function assertCanModifyContractAttachment(params: {
  attachmentUploadedAt: Date | null | undefined;
  role: UserRole;
  justification: string | undefined;
}) {
  const status = getAttachmentCorrectionStatus(params);

  if (!status.canModify) {
    throw new Error("A janela de correcao do anexo principal expirou para este perfil.");
  }

  if (status.requiresAdminJustification && !params.justification?.trim()) {
    throw new Error("A justificativa do ADMIN e obrigatoria apos o prazo de 15 minutos.");
  }

  return status;
}
