import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TourStep {
  title: string;
  content: string;
}

interface Props {
  tourId: string;
  steps: TourStep[];
  triggerLabel?: string;
}

const STORAGE_KEY_PREFIX = "tour_completed_";

export default function ProductTour({ tourId, steps, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = `${STORAGE_KEY_PREFIX}${tourId}`;

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const finish = useCallback(() => {
    setOpen(false);
    setCurrentStep(0);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else finish();
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = steps[currentStep];

  return (
    <>
      <button
        onClick={() => { setOpen(true); setCurrentStep(0); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Tutorial"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-card border border-border/50 rounded-xl card-shadow overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {currentStep + 1}/{steps.length}
                </span>
                <h3 className="text-sm font-semibold">{step.title}</h3>
              </div>
              <button onClick={finish} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content with scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {step.content}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 px-5 py-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                disabled={currentStep === 0}
                className="text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={next}
                className="text-xs gap-1 gradient-bg border-0 text-primary-foreground hover:opacity-90"
              >
                {currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
                {currentStep < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Tour definitions for each page
export const TOURS = {
  dashboard: {
    tourId: "dashboard",
    steps: [
      { title: "Métricas principais", content: "O dashboard exibe Views (total de cliques nos seus Smart Links), Vendas (conversões aprovadas), Taxa de Conversão, Faturamento e Ticket Médio para o período selecionado." },
      { title: "Filtros de período", content: "Use os botões de período (7 dias, 30 dias, etc.) para alterar o intervalo dos dados exibidos. O filtro personalizado permite escolher datas específicas em um calendário." },
      { title: "Gráfico de Tráfego", content: "O gráfico mostra a evolução diária de Views e Vendas no período. Passe o mouse sobre os pontos para ver detalhes." },
      { title: "Tabela de Smart Links", content: "A tabela inferior mostra a performance individual de cada Smart Link no período selecionado, incluindo views, vendas, receita e taxa de conversão." },
    ],
  },
  smartLinks: {
    tourId: "smart-links",
    steps: [
      { title: "O que é um Smart Link?", content: "Um Smart Link é uma URL inteligente que distribui tráfego entre múltiplas variantes (páginas de destino) com pesos configuráveis. Isso permite testar diferentes páginas e otimizar conversões." },
      { title: "Variantes e pesos", content: "Cada Smart Link pode ter várias variantes, cada uma com uma URL de destino e um peso (%). Os pesos devem somar 100%. O tráfego é distribuído proporcionalmente ao peso de cada variante ativa." },
      { title: "Click ID", content: "A cada redirecionamento, um click_id único é gerado e passado via parâmetro UTM (utm_term) para a página de destino. Esse ID permite atribuir vendas ao Smart Link e variante corretos." },
      { title: "Limite de Smart Links", content: "Cada conta pode criar até 25 Smart Links no total, independente do número de projetos." },
    ],
  },
  utmReport: {
    tourId: "utm-report",
    steps: [
      { title: "Origem dos dados", content: "O relatório UTM agrupa os dados de cliques (views) e vendas atribuídas por parâmetros UTM: Campaign, Medium, Content e Source." },
      { title: "Como interpretar", content: "Campaign identifica a campanha; Medium o canal (ex: facebook, google); Content diferencia criativos; Source a origem do tráfego. Use esses dados para identificar quais campanhas e canais geram mais vendas." },
      { title: "Taxa e Ticket Médio", content: "A taxa mostra a conversão por agrupamento UTM. O ticket médio é o valor médio por venda. Valores nulos aparecem como '(not set)'." },
    ],
  },
  webhookLogs: {
    tourId: "webhook-logs",
    steps: [
      { title: "Como funciona", content: "Quando uma venda é realizada na sua plataforma de vendas, ela envia um webhook para a URL configurada. O sistema processa o webhook, identifica a plataforma e tenta atribuir a venda a um click_id." },
      { title: "Status", content: "• approved: venda confirmada e atribuída\n• duplicate: transação já processada anteriormente\n• ignored: evento não relevante (ex: abandono)\n• error: falha no processamento\n• refunded/chargedback/canceled: estornos e cancelamentos" },
      { title: "Atribuição", content: "Quando o webhook contém um click_id válido, a venda é atribuída ao Smart Link e variante correspondentes. Vendas sem click_id ficam como 'Não atribuído'." },
    ],
  },
  settings: {
    tourId: "settings",
    steps: [
      { title: "Domínio personalizado", content: "Você pode usar seu próprio subdomínio para os Smart Links. Para configurar:\n\n1. Acesse seu provedor de DNS\n2. Crie um registro CNAME:\n   • Nome: tracker (ou o subdomínio desejado)\n   • Apontar para: ykgawuawtfpghshuwmde.supabase.co\n3. Aguarde a propagação DNS (até 48h)\n4. O domínio deve responder via HTTPS" },
      { title: "URL do Webhook", content: "Copie a URL do webhook e cole na configuração de webhook da sua plataforma de vendas. Cada projeto tem uma URL única. Todas as vendas recebidas são automaticamente processadas." },
      { title: "Webhook Secret", content: "O Webhook Secret é opcional e adiciona uma camada extra de segurança. Se configurado, envie o header 'x-webhook-secret' em cada webhook. Apenas webhooks com o secret correto serão aceitos." },
    ],
  },
};
