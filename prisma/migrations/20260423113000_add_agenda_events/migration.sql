-- CreateEnum
CREATE TYPE "AgendaEventCategory" AS ENUM ('REUNIAO', 'PRAZO', 'TAREFA', 'LEMBRETE', 'OUTRO');

-- CreateEnum
CREATE TYPE "AgendaEventPriority" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "agenda_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "category" "AgendaEventCategory" NOT NULL DEFAULT 'OUTRO',
    "priority" "AgendaEventPriority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_events_created_by_id_date_idx" ON "agenda_events"("created_by_id", "date");

-- CreateIndex
CREATE INDEX "agenda_events_date_idx" ON "agenda_events"("date");

-- AddForeignKey
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
