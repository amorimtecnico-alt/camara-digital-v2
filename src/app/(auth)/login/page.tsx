import { redirect } from "next/navigation";

import { AppBrand } from "@/components/branding/app-brand";
import { getCurrentUser } from "@/lib/auth";
import { LoginAccessCard } from "@/modules/auth/components/login-access-card";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const moduleItems = ["Contratos", "Protocolos", "Licitações", "Fornecedores", "Relatórios"];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#edf4fb] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1480px] overflow-hidden rounded-[40px] border border-[#d6e3ef] bg-white shadow-[0_34px_90px_rgba(12,34,59,0.12)] lg:grid-cols-[1.5fr_1fr]">
        <section className="relative flex min-h-[520px] flex-col overflow-hidden bg-[#0F2A44] px-8 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
          <div className="relative z-10 max-w-3xl">
            <AppBrand showIcon />

            <div className="mt-6 h-px w-40 bg-white/18" />

            <h1 className="mt-12 max-w-[720px] text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[58px]">
              Gestão inteligente para a administração pública
            </h1>

            <p className="mt-6 max-w-[680px] text-base leading-8 text-white/72 sm:text-lg">
              Organize contratos, protocolos, licitações e rotinas internas com segurança, padronização e controle total
              das informações.
            </p>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 text-sm font-medium text-white/84">
              {moduleItems.map((item) => (
                <div key={item} className="inline-flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#47C57A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute right-10 top-12 grid grid-cols-6 gap-2 opacity-18">
            {Array.from({ length: 48 }).map((_, index) => (
              <span key={index} className="h-1.5 w-1.5 rounded-full bg-white" />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,_rgba(71,197,122,0.16),_transparent_56%)]" />

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-56 opacity-20">
            <svg viewBox="0 0 1200 320" className="h-full w-full">
              <path
                d="M150 280h900M260 280V150h160v130m80 0V120h180v160m80 0V170h150v110M370 150V95h50v55m360 20v-75h55v75M600 120V70h80v50"
                fill="none"
                stroke="rgba(255,255,255,0.62)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[linear-gradient(180deg,_#fdfefe_0%,_#f5f9fd_100%)] px-6 py-8 sm:px-10 lg:px-12">
          <LoginAccessCard error={params.error} />
        </section>
      </div>
    </main>
  );
}
