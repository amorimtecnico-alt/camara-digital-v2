import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SupplierFormProps = {
  action: (formData: FormData) => Promise<void>;
  returnTo?: string;
  submitLabel: string;
  supplier?: {
    id: string;
    companyName: string;
    tradeName: string | null;
    document: string;
    email: string | null;
    phone: string | null;
    contactName: string | null;
  };
};

export function SupplierForm({ action, returnTo, submitLabel, supplier }: SupplierFormProps) {
  return (
    <form action={action} className="space-y-5">
      {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="companyName" className="text-sm font-medium">
            Razao social
          </label>
          <Input
            id="companyName"
            name="companyName"
            defaultValue={supplier?.companyName ?? ""}
            placeholder="Fornecedor Exemplo Ltda"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tradeName" className="text-sm font-medium">
            Nome fantasia
          </label>
          <Input
            id="tradeName"
            name="tradeName"
            defaultValue={supplier?.tradeName ?? ""}
            placeholder="Fornecedor Exemplo"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="document" className="text-sm font-medium">
            Documento
          </label>
          <Input
            id="document"
            name="document"
            defaultValue={supplier?.document ?? ""}
            placeholder="CPF ou CNPJ"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contactName" className="text-sm font-medium">
            Contato principal
          </label>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={supplier?.contactName ?? ""}
            placeholder="Nome do responsavel"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={supplier?.email ?? ""}
            placeholder="contato@fornecedor.com.br"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Telefone
          </label>
          <Input
            id="phone"
            name="phone"
            defaultValue={supplier?.phone ?? ""}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}
