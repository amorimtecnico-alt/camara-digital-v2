"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { loginAction } from "@/modules/auth/actions";

type LoginAccessCardProps = {
  error?: string | undefined;
};

function ShieldIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-[#14735d]">
      <path
        fill="currentColor"
        d="M12 2.5 4.5 5.4v5.5c0 4.7 3.1 9 7.5 10.6 4.4-1.6 7.5-5.9 7.5-10.6V5.4L12 2.5Zm0 2.1 5.5 2.1v4.2c0 3.7-2.3 7.1-5.5 8.5-3.2-1.4-5.5-4.8-5.5-8.5V6.7L12 4.6Zm-1 3.4v8.1l6-4-6-4Z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 text-foreground/45">
      <path
        fill="currentColor"
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Zm2.5-.5a.5.5 0 0 0-.5.5v.3l6 4.8 6-4.8v-.3a.5.5 0 0 0-.5-.5h-11Zm11.5 3.4-5.4 4.3a1 1 0 0 1-1.2 0L6 8.4v10.1c0 .3.2.5.5.5h11c.3 0 .5-.2.5-.5V8.4Z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 text-foreground/45">
      <path
        fill="currentColor"
        d="M7 10V8a5 5 0 1 1 10 0v2h.5A2.5 2.5 0 0 1 20 12.5v7A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5v-7A2.5 2.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 1 0-6 0v2Zm3 3a1.5 1.5 0 0 1 .9 2.7v1.8a.9.9 0 1 1-1.8 0v-1.8A1.5 1.5 0 0 1 12 13Z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 text-foreground/55">
      <path
        fill="currentColor"
        d="M3.5 12c1.8-3.3 5.1-5.5 8.5-5.5s6.7 2.2 8.5 5.5c-1.8 3.3-5.1 5.5-8.5 5.5S5.3 15.3 3.5 12Zm8.5 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.8a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z"
      />
    </svg>
  ) : (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 text-foreground/55">
      <path
        fill="currentColor"
        d="m4.7 3.3 16 16-1.4 1.4-3.1-3.1c-1.2.6-2.7.9-4.2.9-3.5 0-6.8-2-8.9-5.5a11.6 11.6 0 0 1 3.7-4L3.3 4.7l1.4-1.4Zm5.4 5.4 4.5 4.5a2.8 2.8 0 0 0-4.5-4.5Zm9.8 3.3c-.8 1.5-2 2.8-3.5 3.8L15 14.4a3.5 3.5 0 0 0-5.4-5.4L8 7.4c1.2-.6 2.6-.9 4-.9 3.5 0 6.8 2.2 8.5 5.5Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path fill="#4285F4" d="M21.8 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.2-1.1 2.3-2.3 3v2.5h3.7c2.1-1.9 3-4.7 3-7.8Z" />
      <path fill="#FBBC05" d="M6.7 13.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.8H3C2.2 9.2 1.8 10.5 1.8 12S2.2 14.8 3 16.2l3.7-2.5Z" />
      <path fill="#34A853" d="M12 21.2c2.5 0 4.6-.8 6.2-2.2l-3.7-2.5c-1 .7-2.2 1.1-3.5 1.1-2.5 0-4.7-1.7-5.4-4l-3.7 2.5c1.6 3.1 4.8 5.1 8.1 5.1Z" />
    </svg>
  );
}

function FieldShell({
  children,
  icon,
  trailing,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#d7e3ee] bg-[#fbfdff] px-4 py-3 shadow-[0_1px_0_rgba(16,32,51,0.03)]">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

export function LoginAccessCard({ error }: LoginAccessCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleGoogleSignIn() {
    startGoogleTransition(async () => {
      await signIn("google", { callbackUrl: "/dashboard" });
    });
  }

  return (
    <div className="w-full max-w-[430px] rounded-[34px] border border-[#dbe5f1] bg-white p-8 shadow-[0_26px_70px_rgba(16,32,51,0.10)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#def5ed]">
        <ShieldIcon />
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/78">Acesso</p>
        <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-foreground">Acesso ao sistema</h2>
        <p className="mt-2 text-sm leading-6 text-foreground/66">Entre com suas credenciais para continuar.</p>
      </div>

      <div className="mt-6">
        <StatusMessage error={error} />
      </div>

      <form action={loginAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <FieldShell icon={<MailIcon />}>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Digite seu e-mail"
              autoComplete="email"
              required
              className="border-0 bg-transparent px-0 py-0 text-[15px] shadow-none focus:border-0"
            />
          </FieldShell>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <FieldShell
            icon={<LockIcon />}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Visualizar senha"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/4"
                onClick={() => setShowPassword((current) => !current)}
              >
                <EyeIcon open={showPassword} />
              </button>
            }
          >
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
              className="border-0 bg-transparent px-0 py-0 text-[15px] shadow-none focus:border-0"
            />
          </FieldShell>
        </div>

        <Button className="mt-2 w-full rounded-[18px] py-3 text-base">Entrar</Button>
      </form>

      <div className="mt-4 flex justify-end">
        <Link href="/login/recuperar-senha" className="text-sm font-medium text-primary transition hover:text-primary/80">
          Esqueceu sua senha?
        </Link>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-foreground/38">
        <span className="h-px flex-1 bg-[#d6e1ec]" />
        ou
        <span className="h-px flex-1 bg-[#d6e1ec]" />
      </div>

      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-3 rounded-[18px] border border-[#d7e3ee] bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/28 hover:bg-[#f8fbff] disabled:opacity-70"
        onClick={handleGoogleSignIn}
        disabled={isGooglePending}
      >
        <GoogleIcon />
        {isGooglePending ? "Conectando..." : "Entrar com Google"}
      </button>

      <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-foreground/42">Sistema seguro e protegido</p>
    </div>
  );
}
