import { SettingsView } from "@/components/settings/settings-view";

export const metadata = {
  title: "Configurações do Sistema | ExtinControl CRM",
  description: "Configurações gerais, segurança, PIN de proteção e controle de acessos.",
};

export default function ConfiguracoesPage() {
  return <SettingsView />;
}
