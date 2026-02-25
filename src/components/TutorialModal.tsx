import { X, HelpCircle } from "lucide-react";
import { useState } from "react";

interface TutorialSection {
  title: string;
  content: string;
}

interface Props {
  title: string;
  sections: TutorialSection[];
  triggerLabel?: string;
  triggerSize?: "sm" | "icon";
}

export default function TutorialModal({ title, sections, triggerLabel, triggerSize = "icon" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Tutorial"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-lg bg-card border border-border/50 rounded-xl card-shadow overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">{title}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              {sections.map((s, i) => (
                <div key={i}>
                  <h3 className="text-xs font-semibold text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-border/50 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 text-xs rounded-lg gradient-bg text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Pre-built tutorials for each page
export const TUTORIALS = {
  dashboard: {
    title: "Tutorial — Dashboard",
    sections: [
      { title: "Métricas principais", content: "O dashboard exibe Views (total de cliques nos seus Smart Links), Vendas (conversões aprovadas), Taxa de Conversão, Faturamento e Ticket Médio para o período selecionado." },
      { title: "Meta de faturamento", content: "A barra de progresso no topo mostra seu avanço em relação à meta fixa atual. As metas são progressivas: R$ 1M → R$ 5M → R$ 10M → R$ 25M → R$ 50M. Ao atingir uma meta, a próxima é automaticamente definida." },
      { title: "Filtros de período", content: "Use os botões de período (7 dias, 30 dias, etc.) para alterar o intervalo dos dados exibidos. O filtro personalizado permite escolher datas específicas em um calendário." },
      { title: "Tabela de Smart Links", content: "A tabela inferior mostra a performance individual de cada Smart Link no período selecionado, incluindo views, vendas, receita e taxa de conversão." },
    ],
  },
  smartLinks: {
    title: "Tutorial — Smart Links",
    sections: [
      { title: "O que é um Smart Link?", content: "Um Smart Link é uma URL inteligente que distribui tráfego entre múltiplas variantes (páginas de destino) com pesos configuráveis. Isso permite testar diferentes páginas e otimizar conversões." },
      { title: "Variantes e pesos", content: "Cada Smart Link pode ter várias variantes, cada uma com uma URL de destino e um peso (%). Os pesos devem somar 100%. O tráfego é distribuído proporcionalmente ao peso de cada variante ativa." },
      { title: "Click ID", content: "A cada redirecionamento, um click_id único é gerado e passado via parâmetro UTM (utm_term) para a página de destino. Esse ID permite atribuir vendas ao Smart Link e variante corretos." },
      { title: "Limite de Smart Links", content: "Cada conta pode criar até 25 Smart Links no total, independente do número de projetos." },
    ],
  },
  utmReport: {
    title: "Tutorial — Relatório UTM",
    sections: [
      { title: "Origem dos dados", content: "O relatório UTM agrupa os dados de cliques (views) e vendas atribuídas por parâmetros UTM: Campaign, Medium, Content e Source." },
      { title: "Como interpretar", content: "Campaign identifica a campanha; Medium o canal (ex: facebook, google); Content diferencia criativos; Source a origem do tráfego. Use esses dados para identificar quais campanhas e canais geram mais vendas." },
      { title: "Taxa e Ticket Médio", content: "A taxa mostra a conversão por agrupamento UTM. O ticket médio é o valor médio por venda. Valores nulos aparecem como '(not set)'." },
    ],
  },
  webhookLogs: {
    title: "Tutorial — Webhook Logs",
    sections: [
      { title: "Como funciona", content: "Quando uma venda é realizada na sua plataforma de vendas, ela envia um webhook para a URL configurada. O sistema processa o webhook, identifica a plataforma e tenta atribuir a venda a um click_id." },
      { title: "Status", content: "• approved: venda confirmada e atribuída\n• duplicate: transação já processada anteriormente\n• ignored: evento não relevante (ex: abandono)\n• error: falha no processamento\n• refunded/chargedback/canceled: estornos e cancelamentos" },
      { title: "Atribuição", content: "Quando o webhook contém um click_id válido, a venda é atribuída ao Smart Link e variante correspondentes. Vendas sem click_id ficam como 'Não atribuído'." },
    ],
  },
  settings: {
    title: "Tutorial — Configurações",
    sections: [
      { title: "Domínio personalizado do Tracker", content: "Você pode usar seu próprio subdomínio para os Smart Links. Para configurar:\n\n1. Acesse seu provedor de DNS\n2. Crie um registro CNAME:\n   • Nome: tracker (ou o subdomínio desejado)\n   • Apontar para: ykgawuawtfpghshuwmde.supabase.co\n3. Aguarde a propagação DNS (até 48h)\n4. O domínio deve responder via HTTPS" },
      { title: "URL do Webhook", content: "Copie a URL do webhook e cole na configuração de webhook da sua plataforma de vendas. Cada projeto tem uma URL única. Todas as vendas recebidas são automaticamente processadas." },
      { title: "Webhook Secret", content: "O Webhook Secret é opcional e adiciona uma camada extra de segurança. Se configurado, envie o header 'x-webhook-secret' em cada webhook. Apenas webhooks com o secret correto serão aceitos." },
    ],
  },
};
