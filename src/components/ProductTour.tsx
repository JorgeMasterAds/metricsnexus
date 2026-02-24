import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TourStep {
  title: string;
  content: string;
  /** CSS selector for the element to highlight. If omitted, shows centered modal. */
  target?: string;
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
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const storageKey = `${STORAGE_KEY_PREFIX}${tourId}`;

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  // Update target rect when step changes
  useEffect(() => {
    if (!open) return;
    const step = steps[currentStep];
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [open, currentStep, steps]);

  // Recompute on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const step = steps[currentStep];
      if (!step.target) { setTargetRect(null); return; }
      const el = document.querySelector(step.target);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, currentStep, steps]);

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

  // Compute tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Centered modal
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const pad = 12;
    const tooltipW = Math.min(360, window.innerWidth - 32);
    const tooltipH = 240; // approximate

    // Try below
    let top = targetRect.bottom + pad;
    let left = targetRect.left + targetRect.width / 2 - tooltipW / 2;

    // If below overflows, try above
    if (top + tooltipH > window.innerHeight - 16) {
      top = targetRect.top - pad - tooltipH;
    }
    // If above overflows, just center vertically
    if (top < 16) {
      top = Math.max(16, targetRect.top + targetRect.height / 2 - tooltipH / 2);
    }

    // Clamp horizontal
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));

    return {
      position: "fixed",
      top,
      left,
      width: tooltipW,
    };
  };

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

      {open && createPortal(
        <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
          {/* SVG overlay with cutout */}
          <svg
            className="fixed inset-0 w-full h-full"
            style={{ pointerEvents: "none" }}
          >
            <defs>
              <mask id={`tour-mask-${tourId}`}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - 6}
                    y={targetRect.top - 6}
                    width={targetRect.width + 12}
                    height={targetRect.height + 12}
                    rx="8"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.7)"
              mask={`url(#tour-mask-${tourId})`}
            />
          </svg>

          {/* Highlight ring around target */}
          {targetRect && (
            <div
              className="fixed border-2 border-primary rounded-lg pointer-events-none"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                boxShadow: "0 0 0 4px hsl(var(--primary) / 0.25)",
                transition: "all 0.3s ease",
              }}
            />
          )}

          {/* Click catcher for overlay area */}
          <div
            className="fixed inset-0"
            style={{ pointerEvents: "auto" }}
            onClick={finish}
          />

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              ...getTooltipStyle(),
              pointerEvents: "auto",
              zIndex: 10000,
              maxHeight: "calc(100vh - 32px)",
              maxWidth: "calc(100vw - 32px)",
              minWidth: 280,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
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
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                {step.content}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 px-4 py-2 shrink-0">
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
            <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between shrink-0">
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
        </div>,
        document.body
      )}
    </>
  );
}

// Tour definitions for each page
export const TOURS = {
  dashboard: {
    tourId: "dashboard",
    steps: [
      { title: "Métricas principais", content: "O dashboard exibe Views (total de cliques nos seus Smart Links), Vendas (conversões aprovadas), Taxa de Conversão, Faturamento e Ticket Médio para o período selecionado.", target: ".grid.grid-cols-2" },
      { title: "Filtros de período", content: "Use os botões de período (7 dias, 30 dias, etc.) para alterar o intervalo dos dados exibidos. O filtro personalizado permite escolher datas específicas em um calendário." },
      { title: "Gráfico de Tráfego", content: "O gráfico mostra a evolução diária de Views e Vendas no período. Passe o mouse sobre os pontos para ver detalhes." },
      { title: "Gráfico de Vendas", content: "O gráfico de vendas diárias mostra a quantidade de vendas (barras) e a receita (linha) por dia. Order bumps são contabilizados separadamente na tabela de produtos abaixo." },
      { title: "Resumo por Produto", content: "A tabela de produtos exibe vendas, receita, ticket médio e percentual do faturamento total por produto. Order bumps são identificados separadamente." },
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
      { title: "Domínio personalizado", content: "Você pode usar seu próprio subdomínio para os Smart Links. Configure um registro CNAME no seu provedor DNS apontando para o servidor." },
      { title: "URL do Webhook", content: "Copie a URL do webhook e cole na configuração de webhook da sua plataforma de vendas. Cada projeto tem uma URL única. Todas as vendas recebidas são automaticamente processadas." },
      { title: "Webhook Secret", content: "O Webhook Secret é opcional e adiciona uma camada extra de segurança. Se configurado, envie o header 'x-webhook-secret' com este valor em cada webhook. Apenas webhooks com o secret correto serão aceitos." },
    ],
  },
};
