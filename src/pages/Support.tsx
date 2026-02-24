import DashboardLayout from "@/components/DashboardLayout";
import { MessageCircle, Mail, TicketCheck, BookOpen, GraduationCap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "5511959939693";
const SUPPORT_EMAIL = "suporte@nexusmetrics.com";

const cards = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Fale diretamente com nossa equipe pelo WhatsApp.",
    action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Nexus%20Metrics`, "_blank"),
    label: "Abrir WhatsApp",
    color: "text-success",
  },
  {
    icon: Mail,
    title: "E-mail",
    description: "Envie sua dúvida ou solicitação por e-mail.",
    action: () => window.open(`mailto:${SUPPORT_EMAIL}?subject=Suporte%20Nexus%20Metrics`, "_blank"),
    label: "Enviar e-mail",
    color: "text-primary",
  },
  {
    icon: TicketCheck,
    title: "Abrir Ticket",
    description: "Registre um chamado para acompanhamento detalhado.",
    action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Gostaria%20de%20abrir%20um%20ticket%20de%20suporte`, "_blank"),
    label: "Criar ticket",
    color: "text-warning",
  },
  {
    icon: BookOpen,
    title: "Documentação",
    description: "Consulte guias e referências técnicas da plataforma.",
    action: () => window.open("#", "_blank"),
    label: "Ver documentação",
    color: "text-accent-foreground",
  },
  {
    icon: GraduationCap,
    title: "Tutoriais",
    description: "Aprenda a usar cada recurso com tutoriais passo a passo.",
    action: () => window.open("#", "_blank"),
    label: "Ver tutoriais",
    color: "text-primary",
  },
];

export default function Support() {
  return (
    <DashboardLayout title="Suporte" subtitle="Central de ajuda e atendimento">
      <div className="max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl bg-card border border-border/50 card-shadow p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-muted/50 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">{card.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
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

        <div className="mt-8 rounded-xl bg-card border border-border/50 card-shadow p-6 text-center">
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
      </div>
    </DashboardLayout>
  );
}
