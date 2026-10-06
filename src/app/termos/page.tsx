import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Termos de Serviço — ExtinControl CRM",
  description: "Termos de Uso e Serviço do ExtinControl CRM",
};

export default function TermsPage() {
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
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Termos de Uso e Serviço
            </h1>
            <p className="text-sm text-neutral-500">ExtinControl CRM — Atualizado em Outubro de 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e utilizar o <strong>ExtinControl CRM</strong>, você concorda com estes termos de uso,
              todas as leis e regulamentos aplicáveis e concorda que é responsável pelo cumprimento de todas as normas vigentes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              2. Uso da Plataforma
            </h2>
            <p>
              O sistema destina-se à gestão operacional, controle de ordens de serviço, rastreabilidade de manutenções
              de extintores e mangueiras, controle de bancada e relacionamento com clientes. O usuário compromete-se
              a utilizar as credenciais de acesso de maneira estritamente pessoal e confidencial.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              3. Propriedade Intelectual e Contato
            </h2>
            <p>
              A estrutura do software, layout e códigos são de titularidade de seus desenvolvedores. Para dúvidas
              sobre os termos de serviço, entre em contato via{" "}
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
