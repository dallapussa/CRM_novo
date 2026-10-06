import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — ExtinControl CRM",
  description: "Política de Privacidade e Proteção de Dados do ExtinControl CRM",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 sm:p-12">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 gap-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Login
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Política de Privacidade
            </h1>
            <p className="text-sm text-neutral-500">ExtinControl CRM — Atualizado em Outubro de 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              1. Visão Geral
            </h2>
            <p>
              O <strong>ExtinControl CRM</strong> valoriza a sua privacidade e está comprometido em proteger
              seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              Esta política descreve como coletamos, usamos e protegemos as suas informações ao utilizar o sistema.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              2. Informações Coletadas
            </h2>
            <p>
              Ao utilizar a autenticação via Google OAuth ou criar uma conta em nossa plataforma, nós coletamos
              apenas os dados estritamente necessários para identificação e segurança:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nome completo;</li>
              <li>Endereço de e-mail;</li>
              <li>Identificador único de autenticação (OAuth ID);</li>
              <li>Dados cadastrais fornecidos para ordens de serviço, clientes e extintores/mangueiras.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              3. Finalidade do Tratamento de Dados
            </h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Autenticar seu acesso de forma segura ao painel operacional;</li>
              <li>Controlar níveis de permissão (Administrador, Técnico, Comercial, Cliente);</li>
              <li>Gerenciar manutenções, inspeções, ensaios hidrostáticos e emissão de selos/etiquetas;</li>
              <li>Comunicações operacionais sobre serviços agendados e orçamentos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              4. Compartilhamento e Segurança
            </h2>
            <p>
              O ExtinControl CRM não vende, aluga ou compartilha seus dados pessoais com terceiros para fins
              publicitários. As informações são armazenadas em infraestrutura em nuvem segura com criptografia
              de ponta a ponta e controle estrito de acesso via Supabase e PostgreSQL.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              5. Seus Direitos (LGPD)
            </h2>
            <p>
              Você tem o direito de solicitar a confirmação do tratamento, acesso aos seus dados, correção de
              informações incompletas ou a exclusão da sua conta e dados pessoais a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              6. Contato com o Encarregado de Dados
            </h2>
            <p>
              Em caso de dúvidas, solicitações ou esclarecimentos sobre esta Política de Privacidade, entre em
              contato pelo e-mail:{" "}
              <a href="mailto:dallapussa@gmail.com" className="text-red-600 dark:text-red-400 font-medium underline">
                dallapussa@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
