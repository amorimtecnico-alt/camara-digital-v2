import { AgendaEventCategory, AgendaEventPriority, type AgendaEvent } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { agendaEventCategoryLabels, agendaEventPriorityLabels } from "@/modules/agenda/schemas";
import { formatAgendaDateKey } from "@/modules/agenda/queries";

type AgendaEventFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultDate: string;
  event?: AgendaEvent;
  returnTo?: string;
  submitLabel: string;
};

export function AgendaEventForm({ action, defaultDate, event, returnTo, submitLabel }: AgendaEventFormProps) {
  return (
    <form action={action} className="space-y-5">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Titulo
        </label>
        <Input id="title" name="title" defaultValue={event?.title ?? ""} placeholder="Reuniao, prazo ou compromisso" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <Textarea id="description" name="description" defaultValue={event?.description ?? ""} rows={3} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="date" className="text-sm font-medium">
            Data
          </label>
          <Input id="date" name="date" type="date" defaultValue={event ? formatAgendaDateKey(event.date) : defaultDate} required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="startTime" className="text-sm font-medium">
            Inicio
          </label>
          <Input id="startTime" name="startTime" type="time" defaultValue={event?.startTime ?? ""} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="endTime" className="text-sm font-medium">
            Fim
          </label>
          <Input id="endTime" name="endTime" type="time" defaultValue={event?.endTime ?? ""} />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">
        <input type="checkbox" name="allDay" defaultChecked={event?.allDay ?? false} className="size-4 accent-primary" />
        Dia inteiro
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-sm font-medium">
            Categoria
          </label>
          <Select id="category" name="category" defaultValue={event?.category ?? AgendaEventCategory.OUTRO}>
            {Object.values(AgendaEventCategory).map((category) => (
              <option key={category} value={category}>
                {agendaEventCategoryLabels[category]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="priority" className="text-sm font-medium">
            Prioridade
          </label>
          <Select id="priority" name="priority" defaultValue={event?.priority ?? AgendaEventPriority.NORMAL}>
            {Object.values(AgendaEventPriority).map((priority) => (
              <option key={priority} value={priority}>
                {agendaEventPriorityLabels[priority]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Observações internas
        </label>
        <Textarea id="notes" name="notes" defaultValue={event?.notes ?? ""} rows={4} />
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

