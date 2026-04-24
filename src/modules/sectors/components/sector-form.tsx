import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SectorFormProps = {
  action: (formData: FormData) => Promise<void>;
  returnTo?: string;
  submitLabel: string;
  sector?: {
    id: string;
    name: string;
    description: string | null;
  };
};

export function SectorForm({ action, returnTo, submitLabel, sector }: SectorFormProps) {
  return (
    <form action={action} className="space-y-5">
      {sector ? <input type="hidden" name="id" value={sector.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={sector?.name ?? ""}
          placeholder="Secretaria Legislativa"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={sector?.description ?? ""}
          placeholder="Descreva as responsabilidades principais do setor."
        />
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

