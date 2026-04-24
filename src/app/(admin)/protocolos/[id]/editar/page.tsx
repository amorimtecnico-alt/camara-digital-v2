import { notFound } from "next/navigation";
import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { canEditProtocol, redirectToAccessDenied, requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { updateProtocolAction } from "@/modules/protocols/actions";
import { ProtocolForm } from "@/modules/protocols/components/protocol-form";
import { getProtocolById } from "@/modules/protocols/queries";
import { protocolStatusLabels } from "@/modules/protocols/schemas";

export const dynamic = "force-dynamic";

type EditarProtocoloPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EditarProtocoloPage({ params, searchParams }: EditarProtocoloPageProps) {
  const currentUser = await requireModulePermission(PermissionModule.protocolos, "edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = resolveReturnTo(getSearchParam(query, "returnTo"), "/protocolos");
  const protocol = await getProtocolById(id);

  if (!protocol) {
    notFound();
  }

  if (!canEditProtocol(currentUser, protocol.createdBy.id)) {
    redirectToAccessDenied();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar protocolo"
          description="Atualize assunto, descrição e status mantendo o histórico de autoria do registro."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(query, "error")} success={getSearchParam(query, "success")} />

      <SectionCard
        title={protocol.code}
        description={`Status atual: ${protocolStatusLabels[protocol.status]}. Criado por ${protocol.createdBy.name}.`}
      >
        <ProtocolForm
          action={updateProtocolAction}
          returnTo={returnTo}
          submitLabel="Salvar alteracoes"
          protocol={{
            id: protocol.id,
            code: protocol.code,
            subject: protocol.subject,
            description: protocol.description,
            status: protocol.status,
            createdByName: protocol.createdBy.name,
          }}
        />
      </SectionCard>
    </div>
  );
}
