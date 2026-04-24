"use server";

import { redirect } from "next/navigation";
import AuthError from "next-auth";

import { signIn, signOut } from "@/auth";
import { parseErrorMessage } from "@/lib/utils";
import { loginSchema } from "@/modules/auth/schemas";
import { validateCredentialsUser } from "@/modules/auth/user-access";

export async function loginAction(formData: FormData) {
  let input: { email: string; password: string };

  try {
    input = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(parseErrorMessage(error))}`);
  }

  const validation = await validateCredentialsUser(input.email, input.password);

  if (validation.reason === "INVALID_CREDENTIALS") {
    redirect("/login?error=Credenciais%20inv%C3%A1lidas.%20Verifique%20seu%20e-mail%20e%20senha.");
  }

  if (validation.reason === "INACTIVE_USER") {
    redirect("/login?error=Seu%20usu%C3%A1rio%20est%C3%A1%20inativo.%20Procure%20um%20administrador.");
  }

  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=Credenciais%20inv%C3%A1lidas.%20Verifique%20seu%20e-mail%20e%20senha.");
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

