import { ProtocolStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { protocolStatusOptions } from "@/modules/protocols/schemas";

type ProtocolFormProps = {
  action: (formData: FormData) => Promise<void>;
  returnTo?: string;
  submitLabel: string;
  protocol?: {
    id: string;
    code: string;
    subject: string;
    description: string | null;
    status: ProtocolStatus;
    createdByName: string;
  };
};

export function ProtocolForm({ action, returnTo, submitLabel, protocol }: ProtocolFormProps) {
  return (
    <form action={action} className="space-y-5">
      {protocol ? <input type="hidden" name="id" value={protocol.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      {protocol ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-sm font-medium">
              Codigo
            </label>
            <Input id="code" value={protocol.code} readOnly disabled />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="createdBy" className="text-sm font-medium">
              Criado por
            </label>
            <Input id="createdBy" value={protocol.createdByName} readOnly disabled />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="subject" className="text-sm font-medium">
            Assunto
          </label>
          <Input
            id="subject"
            name="subject"
            defaultValue={protocol?.subject ?? ""}
            placeholder="Informe o assunto do protocolo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <Select id="status" name="status" defaultValue={protocol?.status ?? ProtocolStatus.OPEN}>
            {protocolStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={protocol?.description ?? ""}
          placeholder="Detalhes complementares do protocolo"
          rows={6}
        />
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

