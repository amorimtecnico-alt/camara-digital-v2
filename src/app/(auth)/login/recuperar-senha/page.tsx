import Link from "next/link";

import { AppBrand } from "@/components/branding/app-brand";

export default function RecuperarSenhaPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,_#eef4fb_0%,_#f8fbff_100%)] px-6 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-8 shadow-sm">
        <AppBrand
          theme="light"
          titleClassName="text-base tracking-[0.22em]"
          subtitleClassName="text-[11px] tracking-[0.3em] text-foreground/55"
        />
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Recuperação de acesso</h1>
        <p className="mt-3 text-sm leading-6 text-foreground/72">
          A redefinição automática de senha não está disponível neste momento. Solicite a recuperação ou redefinição do
          seu acesso ao administrador responsável pelo sistema.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
