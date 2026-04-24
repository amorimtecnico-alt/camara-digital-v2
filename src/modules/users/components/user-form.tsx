import { UserRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type UserFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  sectors: Array<{
    id: string;
    name: string;
  }>;
  submitLabel: string;
  returnTo?: string;
  availableRoles: UserRole[];
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
    sectorId: string | null;
  };
};

const roleOptions = [
  { value: UserRole.ADMIN, label: "Administrador" },
  { value: UserRole.MANAGER, label: "Gestor" },
  { value: UserRole.USER, label: "Usuario" },
];

export function UserForm({ action, availableRoles, mode, returnTo, sectors, submitLabel, user }: UserFormProps) {
  return (
    <form action={action} className="space-y-5">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Nome
          </label>
          <Input
            id="name"
            name="name"
            defaultValue={user?.name ?? ""}
            placeholder="Nome completo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            placeholder="usuario@camara.local"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="role" className="text-sm font-medium">
            Perfil
          </label>
          <Select id="role" name="role" defaultValue={user?.role ?? UserRole.MANAGER}>
            {roleOptions
              .filter((role) => availableRoles.includes(role.value))
              .map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
              ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sectorId" className="text-sm font-medium">
            Setor
          </label>
          <Select id="sectorId" name="sectorId" defaultValue={user?.sectorId ?? ""}>
            <option value="">Sem setor</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            {mode === "create" ? "Senha" : "Nova senha"}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={mode === "create" ? "Minimo de 6 caracteres" : "Deixe em branco para manter"}
            required={mode === "create"}
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-[#415446]">
            <input type="checkbox" name="active" defaultChecked={user?.active ?? true} />
            Usuario ativo
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}
