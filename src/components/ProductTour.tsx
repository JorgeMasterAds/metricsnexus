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
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const computeRect = useCallback(() => {
    if (!open) return;
    const step = steps[currentStep];
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      // Scroll element into view if not visible
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Recompute after scroll
        setTimeout(() => {
          setTargetRect(el.getBoundingClientRect());
        }, 350);
      } else {
        setTargetRect(rect);
      }
    } else {
      setTargetRect(null);
    }
  }, [open, currentStep, steps]);

  // Update target rect when step changes
  useEffect(() => {
    computeRect();
  }, [computeRect]);

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
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const pad = 16;
    const tooltipW = Math.min(420, window.innerWidth - 32);
    const tooltipH = 280;

    // Try below
    let top = targetRect.bottom + pad;
    let left = targetRect.left + targetRect.width / 2 - tooltipW / 2;

    // If below overflows, try above
    if (top + tooltipH > window.innerHeight - 16) {
      top = targetRect.top - pad - tooltipH;
    }
    // If still overflows, position to the right
    if (top < 16) {
      top = Math.max(16, targetRect.top);
      left = targetRect.right + pad;
      if (left + tooltipW > window.innerWidth - 16) {
        left = targetRect.left - pad - tooltipW;
      }
    }

    // Clamp
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16));

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
                    x={targetRect.left - 8}
                    y={targetRect.top - 8}
                    width={targetRect.width + 16}
                    height={targetRect.height + 16}
                    rx="10"
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
              fill="rgba(0,0,0,0.75)"
              mask={`url(#tour-mask-${tourId})`}
            />
          </svg>

          {/* Highlight ring around target */}
          {targetRect && (
            <div
              className="fixed border-2 border-primary rounded-xl pointer-events-none"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: "0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.15)",
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
            className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              ...getTooltipStyle(),
              pointerEvents: "auto",
              zIndex: 10000,
              maxHeight: "calc(100vh - 32px)",
              maxWidth: "calc(100vw - 32px)",
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {currentStep + 1}/{steps.length}
                </span>
                <h3 className="text-base font-semibold">{step.title}</h3>
              </div>
              <button onClick={finish} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-base text-foreground/85 leading-relaxed whitespace-pre-line">
                {step.content}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 px-5 py-2 shrink-0">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentStep ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                size="default"
                onClick={prev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                size="default"
                onClick={next}
                className="gap-1 gradient-bg border-0 text-primary-foreground hover:opacity-90 px-6"
              >
                {currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
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
      {
        title: "Bem-vindo ao Dashboard",
        content: "Aqui você acompanha todas as métricas dos seus Smart Links: Views, Vendas, Taxa de Conversão, Faturamento e Ticket Médio para o período selecionado.",
      },
      {
        title: "Filtros de período",
        content: "Use os botões de período (7 dias, 30 dias, etc.) ou o filtro personalizado com calendário para alterar o intervalo de análise dos dados.",
      },
      {
        title: "Gráficos de performance",
        content: "Os gráficos mostram a evolução diária de Views, Vendas e Receita. Passe o mouse sobre os pontos para ver detalhes de cada dia.",
      },
      {
        title: "Tabela de Smart Links",
        content: "Na parte inferior, veja a performance individual de cada Smart Link: views, vendas, receita e taxa de conversão no período.",
      },
    ],
  },
  smartLinks: {
    tourId: "smart-links",
    steps: [
      {
        title: "O que é um Smart Link?",
        content: "Um Smart Link é uma URL inteligente que distribui tráfego entre múltiplas variantes (páginas de destino) com pesos configuráveis. Isso permite testar diferentes páginas e otimizar conversões.",
      },
      {
        title: "Variantes e pesos",
        content: "Cada Smart Link pode ter várias variantes, cada uma com URL de destino e peso (%). Os pesos devem somar 100%. O tráfego é distribuído proporcionalmente ao peso de cada variante ativa.",
      },
      {
        title: "Click ID e atribuição",
        content: "A cada redirecionamento, um click_id único é gerado e passado via parâmetros (utm_term, click_id, sck) para a página de destino. Esse ID permite atribuir vendas ao Smart Link e variante corretos.",
      },
      {
        title: "Domínio personalizado",
        content: "Configure um domínio personalizado na página de Recursos para que seus links usem seu próprio domínio em vez da URL técnica do Supabase.",
      },
    ],
  },
  utmReport: {
    tourId: "utm-report",
    steps: [
      {
        title: "Relatório UTM",
        content: "O relatório UTM agrupa dados de cliques e vendas por parâmetros UTM: Campaign, Medium, Content e Source.",
      },
      {
        title: "Como interpretar",
        content: "Campaign identifica a campanha; Medium o canal (ex: facebook, google); Content diferencia criativos; Source a origem do tráfego. Use esses dados para identificar quais campanhas geram mais vendas.",
      },
      {
        title: "Taxa e Ticket Médio",
        content: "A taxa mostra a conversão por agrupamento UTM. O ticket médio é o valor médio por venda. Valores nulos aparecem como '(not set)'.",
      },
    ],
  },
  webhookLogs: {
    tourId: "webhook-logs",
    steps: [
      {
        title: "Como funciona",
        content: "Quando uma venda é realizada na sua plataforma de vendas, ela envia um webhook para a URL configurada. O sistema processa o webhook, identifica a plataforma e tenta atribuir a venda a um click_id.",
      },
      {
        title: "Status dos webhooks",
        content: "• approved: venda confirmada e atribuída\n• duplicate: transação já processada\n• ignored: evento não relevante\n• error: falha no processamento\n• refunded/chargedback/canceled: estornos",
      },
      {
        title: "Atribuição",
        content: "Quando o webhook contém um click_id válido, a venda é atribuída ao Smart Link e variante correspondentes. Vendas sem click_id ficam como 'Não atribuído'.",
      },
    ],
  },
  settings: {
    tourId: "settings",
    steps: [
      {
        title: "Configurações",
        content: "Aqui você gerencia seus dados pessoais, organização, equipe, webhooks e assinatura. Navegue pelas abas no menu lateral.",
      },
      {
        title: "Webhook URL",
        content: "Copie a URL do webhook e cole na configuração da sua plataforma de vendas. Cada projeto tem uma URL única. Todas as vendas recebidas são processadas automaticamente.",
      },
      {
        title: "Assinatura",
        content: "Gerencie seu plano, veja limites de uso e faça upgrade para desbloquear mais Smart Links, projetos e webhooks.",
      },
    ],
  },
  resources: {
    tourId: "resources",
    steps: [
      {
        title: "Domínio Personalizado",
        content: "Configure seu próprio domínio para que os Smart Links usem URLs profissionais em vez da URL técnica do Supabase.",
      },
      {
        title: "Configuração DNS",
        content: "Crie um registro CNAME no seu provedor DNS apontando para o servidor indicado. Após a propagação (até 72h), clique em 'Verificar DNS' para ativar.",
      },
      {
        title: "Verificação",
        content: "Após verificar o DNS, seus Smart Links passarão a usar automaticamente o domínio personalizado. Você pode ver isso na página de Smart Links.",
      },
    ],
  },
  integrations: {
    tourId: "integrations",
    steps: [
      {
        title: "Integrações",
        content: "Conecte plataformas de anúncios (Meta Ads, Google Ads) e plataformas de vendas para sincronizar dados automaticamente.",
      },
      {
        title: "Dados de anúncios",
        content: "As integrações de anúncios importam dados de gastos (spend) para calcular métricas como ROI, ROAS e CPA no dashboard.",
      },
    ],
  },
};
