import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkles, Wrench } from "lucide-react";

interface PagePlaceholderProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  status?: "Em breve" | "Em construção";
  actionLabel?: string;
  actionHref?: string;
  extra?: React.ReactNode;
}

export function PagePlaceholder({
  icon: Icon,
  eyebrow = "Módulo",
  title,
  description,
  status = "Em construção",
  actionLabel,
  actionHref,
  extra,
}: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-dashed border-2 shadow-none bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
                status === "Em construção"
                  ? "from-amber-400 to-orange-500 shadow-orange-500/20"
                  : "from-indigo-500 to-purple-500 shadow-indigo-500/20"
              )}>
                <Icon className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5">
                <Badge
                  className={cn(
                    "border px-2 py-0.5 shadow-sm text-[10px] font-bold uppercase tracking-wide",
                    status === "Em construção"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-indigo-500 text-white border-indigo-500"
                  )}
                >
                  <Wrench className="mr-1 h-3 w-3 inline" />
                  {status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 max-w-lg">
              <Badge variant="outline" className="text-[11px] font-semibold tracking-wider uppercase">
                <Sparkles className="mr-1 h-3 w-3 text-primary" />
                {eyebrow}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight">
                {title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {actionLabel && (
                <Button size="lg" disabled={!actionHref} asChild={!!actionHref}>
                  {actionHref ? (
                    <Link href={actionHref}>{actionLabel}</Link>
                  ) : (
                    actionLabel
                  )}
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">
                  ← Voltar ao Dashboard
                </Link>
              </Button>
            </div>

            {extra && <div className="pt-2">{extra}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
