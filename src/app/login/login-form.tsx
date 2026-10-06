"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    if (params.get("error") === "oauth") {
      setError(
        "Não foi possível autenticar com o Google. Verifique se o provedor Google está habilitado no seu painel Supabase."
      );
    }
  }, [params]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const next = redirectTo || params.get("redirect") || "/dashboard";
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar com Google");
      setGoogleLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid") || error.message.includes("Email")) {
          setError("E-mail ou senha inválidos. Verifique e tente novamente.");
        } else {
          setError(error.message);
        }
        return;
      }

      const next = redirectTo || params.get("redirect") || "/dashboard";
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Botão de Login com Google */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading}
        className="w-full h-11 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        Continuar com o Google
      </Button>

      {/* Divisor */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-zinc-950 px-2 text-muted-foreground font-medium">
            ou continue com e-mail
          </span>
        </div>
      </div>

      {/* Formulário de E-mail e Senha */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com.br"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || googleLoading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || googleLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground outline-none"
              tabIndex={-1}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
            {error}
          </div>
        )}

        <Button
          className="w-full h-11 text-sm font-semibold"
          type="submit"
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
    </div>
  );
}
