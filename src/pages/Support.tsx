import DashboardLayout from "@/components/DashboardLayout";
import { MessageCircle, Mail, BookOpen, GraduationCap, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const WHATSAPP_NUMBER = "5511959939693";
const SUPPORT_EMAIL = "suporte@nexusmetrics.com";

const cards = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Fale diretamente com nossa equipe pelo WhatsApp para suporte rápido.",
    action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Nexus%20Metrics`, "_blank"),
    label: "Abrir WhatsApp",
  },
  {
    icon: Mail,
    title: "E-mail",
    description: "Envie sua dúvida ou solicitação detalhada por e-mail.",
    action: () => window.open(`mailto:${SUPPORT_EMAIL}?subject=Suporte%20Nexus%20Metrics`, "_blank"),
    label: "Enviar e-mail",
  },
  {
    icon: BookOpen,
    title: "Documentação",
    description: "Consulte guias e referências técnicas da plataforma.",
    action: () => window.open("#", "_blank"),
    label: "Ver documentação",
  },
  {
    icon: GraduationCap,
    title: "Tutoriais",
    description: "Aprenda a usar cada recurso com tutoriais passo a passo.",
    action: () => window.open("#", "_blank"),
    label: "Ver tutoriais",
  },
];

export default function Support() {
  const { toast } = useToast();
  const { activeAccount } = useAccount();
  const qc = useQueryClient();
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState("");
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState("");
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const deleteProject = async () => {
    toast({ title: "Em desenvolvimento", description: "A exclusão de projetos com confirmação será implementada em breve." });
    setShowDeleteProject(false);
    setDeleteProjectConfirm("");
  };

  const deleteOrganization = async () => {
    toast({ title: "Em desenvolvimento", description: "A exclusão da organização requer suporte técnico." });
    setShowDeleteOrg(false);
    setDeleteOrgConfirm("");
  };

  const deleteAccount = async () => {
    toast({ title: "Em desenvolvimento", description: "Para excluir sua conta, entre em contato com o suporte." });
    setShowDeleteAccount(false);
    setDeleteAccountConfirm("");
  };

  return (
    <DashboardLayout title="Suporte" subtitle="Central de ajuda e atendimento">
      <div className="max-w-3xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl bg-card border border-border/50 card-shadow p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">{card.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-5">
                {card.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={card.action}
              >
                {card.label}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 text-center">
          <h3 className="text-sm font-semibold mb-2">Precisa de ajuda rápida?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Nossa equipe está disponível de segunda a sexta, das 9h às 18h.
          </p>
          <Button
            className="gradient-bg border-0 text-primary-foreground hover:opacity-90 gap-2"
            onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank")}
          >
            <MessageCircle className="h-4 w-4" />
            Falar com suporte
          </Button>
        </div>

        {/* ===== DANGER ZONE ===== */}
        <div className="rounded-xl bg-card border border-destructive/30 card-shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">Zona de Perigo</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Ações irreversíveis. Certifique-se antes de prosseguir.
          </p>

          <div className="space-y-4">
            {/* Delete project */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Excluir projeto</p>
                  <p className="text-xs text-muted-foreground">Remove permanentemente um projeto e todos os dados vinculados.</p>
                </div>
                {!showDeleteProject && (
                  <Button variant="destructive" size="sm" className="text-xs" onClick={() => setShowDeleteProject(true)}>
                    Excluir projeto
                  </Button>
                )}
              </div>
              {showDeleteProject && (
                <div className="space-y-3 mt-3 pt-3 border-t border-destructive/20">
                  <p className="text-xs text-destructive">Para confirmar, digite <strong>EXCLUIR PROJETO</strong>:</p>
                  <Input value={deleteProjectConfirm} onChange={(e) => setDeleteProjectConfirm(e.target.value)} placeholder="EXCLUIR PROJETO" className="border-destructive/50" />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="text-xs" onClick={deleteProject} disabled={deleteProjectConfirm !== "EXCLUIR PROJETO"}>Confirmar exclusão</Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowDeleteProject(false); setDeleteProjectConfirm(""); }}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete organization */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Excluir organização</p>
                  <p className="text-xs text-muted-foreground">Remove a organização, todos os projetos, webhooks e dados.</p>
                </div>
                {!showDeleteOrg && (
                  <Button variant="destructive" size="sm" className="text-xs" onClick={() => setShowDeleteOrg(true)}>
                    Excluir organização
                  </Button>
                )}
              </div>
              {showDeleteOrg && (
                <div className="space-y-3 mt-3 pt-3 border-t border-destructive/20">
                  <p className="text-xs text-destructive">Para confirmar, digite o nome da organização: <strong>{activeAccount?.name || "ORGANIZAÇÃO"}</strong></p>
                  <Input value={deleteOrgConfirm} onChange={(e) => setDeleteOrgConfirm(e.target.value)} placeholder={activeAccount?.name || "Nome da organização"} className="border-destructive/50" />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="text-xs" onClick={deleteOrganization} disabled={deleteOrgConfirm !== (activeAccount?.name || "")}>Confirmar exclusão</Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowDeleteOrg(false); setDeleteOrgConfirm(""); }}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete account */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Excluir minha conta</p>
                  <p className="text-xs text-muted-foreground">Remove permanentemente sua conta de usuário do Nexus Metrics.</p>
                </div>
                {!showDeleteAccount && (
                  <Button variant="destructive" size="sm" className="text-xs" onClick={() => setShowDeleteAccount(true)}>
                    Excluir conta
                  </Button>
                )}
              </div>
              {showDeleteAccount && (
                <div className="space-y-3 mt-3 pt-3 border-t border-destructive/20">
                  <p className="text-xs text-destructive">Para confirmar, digite <strong>APAGAR MINHA CONTA</strong>:</p>
                  <Input value={deleteAccountConfirm} onChange={(e) => setDeleteAccountConfirm(e.target.value)} placeholder="APAGAR MINHA CONTA" className="border-destructive/50" />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="text-xs" onClick={deleteAccount} disabled={deleteAccountConfirm !== "APAGAR MINHA CONTA"}>Confirmar exclusão</Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowDeleteAccount(false); setDeleteAccountConfirm(""); }}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
