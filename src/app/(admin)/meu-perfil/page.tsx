import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { requireUser } from "@/lib/auth";
import { getSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { removeProfileAvatarAction, updateProfileAction } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

type MeuPerfilPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export default async function MeuPerfilPage({ searchParams }: MeuPerfilPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const userInitials = getInitials(user.name);

  return (
    <div className="space-y-8">
      <PageHeader title="Meu perfil" description="Atualize seus dados de acesso e imagem de perfil." />

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard title="Dados do usuário" description="Estas informações pertencem apenas ao seu usuário.">
        <form action={updateProfileAction} className="space-y-5">
          <input type="hidden" name="returnTo" value="/meu-perfil" />

          <div className="flex items-center gap-4">
            {user.avatarPath ? (
              <img src={user.avatarPath} alt="Avatar atual" className="size-16 rounded-full border border-border object-cover" />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-sidebar text-lg font-semibold text-sidebar-foreground">
                {userInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-sm text-foreground/70">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="profileName" className="text-sm font-medium">
                Nome
              </label>
              <Input id="profileName" name="name" defaultValue={user.name} required />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profileEmail" className="text-sm font-medium">
                Email
              </label>
              <Input id="profileEmail" name="email" type="email" defaultValue={user.email} required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="profilePassword" className="text-sm font-medium">
                Nova senha
              </label>
              <Input id="profilePassword" name="password" type="password" placeholder="Deixe em branco para manter" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profileAvatarFile" className="text-sm font-medium">
                Upload/alterar avatar
              </label>
              <Input id="profileAvatarFile" name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button>Salvar perfil</Button>
          </div>
        </form>

        {user.avatarPath ? (
          <form action={removeProfileAvatarAction} className="mt-4 flex justify-end">
            <input type="hidden" name="returnTo" value="/meu-perfil" />
            <Button variant="secondary">Remover avatar</Button>
          </form>
        ) : null}
      </SectionCard>
    </div>
  );
}

