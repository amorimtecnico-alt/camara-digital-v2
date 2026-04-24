import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AcessoNegadoPage() {
  await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Acesso negado"
        description="Seu perfil autenticado não possui permissão para acessar este recurso."
      />

      <SectionCard
        title="Permissao insuficiente"
        description="Se este acesso deveria estar liberado, revise o perfil do usuário ou ajuste a regra administrativa."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/dashboard">Voltar ao início</ButtonLink>
          <ButtonLink href="/protocolos" variant="secondary">
            Ir para protocolos
          </ButtonLink>
        </div>
      </SectionCard>
    </div>
  );
}

