"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, ArrowLeft, Flame } from "lucide-react";
import Link from "next/link";

export default function RecoverPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/redefinir-senha`
            : undefined,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-50 via-white to-red-50/40">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground self-start">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar para o login
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md shadow-red-500/20">
            <Flame className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-display tracking-tight">
              {sent ? "Verifique seu e-mail" : "Recuperar minha senha"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {sent
                ? "Enviamos um link de redefinição para o e-mail informado. Confira sua caixa de entrada (e a caixa de spam)."
                : "Digite o e-mail cadastrado. Enviaremos um link para você redefinir sua senha com segurança."}
            </p>
          </div>
        </div>

        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="seu@email.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button className="w-full h-11 text-sm font-semibold" disabled={loading} type="submit">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="font-semibold text-green-800">Link enviado!</p>
              <p className="text-sm text-green-700/90 leading-relaxed">
                Se o e-mail <strong>{email}</strong> tiver cadastro, você receberá a mensagem em breve.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Voltar para o login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
