"use client";

import { useState } from "react";
import { Lock, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyPin, isPinTemporarilyUnlocked } from "@/services/settings-security.service";

export interface PinModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  actionType?: "price" | "delete" | "generic";
}

export function PinModal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  onSuccess,
  title,
  description,
  actionType = "generic",
}: PinModalProps) {
  const isModalOpen = open !== undefined ? open : (isOpen ?? false);
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const defaultTitle =
    actionType === "price"
      ? "Confirmação de Segurança: Alteração de Preço"
      : actionType === "delete"
      ? "Confirmação de Segurança: Exclusão de Registro"
      : "Ação Protegida por PIN";

  const defaultDescription =
    actionType === "price"
      ? "Digite o PIN de 4 dígitos do Administrador para autorizar a modificação deste valor."
      : actionType === "delete"
      ? "Digite o PIN de 4 dígitos do Administrador para confirmar a exclusão deste item."
      : "Digite o PIN de 4 dígitos para continuar com esta operação.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("O PIN deve ter exatamente 4 dígitos numéricos.");
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyPin(pin);
      if (isValid) {
        setPin("");
        setError("");
        onSuccess();
        handleClose();
      } else {
        setError("PIN incorreto. Tente novamente ou consulte o Administrador.");
      }
    } catch {
      setError("Erro ao validar o PIN.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleDigitClick(digit: string) {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={(openVal) => !openVal && handleClose()}>
      <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 mb-2">
              {actionType === "delete" ? (
                <ShieldAlert className="h-6 w-6" />
              ) : (
                <KeyRound className="h-6 w-6" />
              )}
            </div>
            <DialogTitle className="text-base font-bold text-center">
              {title || defaultTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground">
              {description || defaultDescription}
            </DialogDescription>
          </DialogHeader>

          {/* Visualizador dos 4 dígitos */}
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const hasVal = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                    hasVal
                      ? "border-red-600 bg-red-50 dark:bg-red-950/30 text-red-600 shadow-xs scale-105"
                      : "border-neutral-200 dark:border-neutral-700 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {hasVal ? "•" : ""}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="text-xs text-center font-medium text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </p>
          )}

          {/* Teclado numérico virtual para agilidade */}
          <div className="grid grid-cols-3 gap-2 pt-1 max-w-[220px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigitClick(d)}
                className="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold text-base transition-colors flex items-center justify-center active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin("")}
              className="h-10 rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors flex items-center justify-center active:scale-95"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handleDigitClick("0")}
              className="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold text-base transition-colors flex items-center justify-center active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-10 rounded-xl bg-muted text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors flex items-center justify-center active:scale-95"
            >
              ⌫
            </button>
          </div>

          <DialogFooter className="flex-row sm:justify-between gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pin.length !== 4 || isVerifying}
              className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isVerifying ? "Validando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
