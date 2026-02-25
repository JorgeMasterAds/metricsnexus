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
      { title: "Métricas principais", content: "O dashboard exibe Views (total de cliques), Vendas (conversões aprovadas), Taxa de Conversão, Faturamento, Ticket Médio, ROI e ROAS para o período selecionado." },
      { title: "Meta de faturamento", content: "Defina sua meta de faturamento personalizada. A barra de progresso mostra seu avanço. Clique no ícone de edição para alterar a meta." },
      { title: "Filtros de período", content: "Use os botões de período ou o filtro personalizado para alterar o intervalo dos dados exibidos." },
      { title: "Seções reordenáveis", content: "Ative o modo de edição para arrastar e reordenar as seções do dashboard conforme sua preferência." },
      { title: "Tabela de Smart Links", content: "A tabela inferior mostra a performance individual de cada Smart Link incluindo views, vendas, receita, taxa de conversão e ticket médio." },
    ],
  },
  smartLinks: {
    title: "Tutorial — Smart Links",
    sections: [
      { title: "O que é um Smart Link?", content: "Um Smart Link é uma URL inteligente que distribui tráfego entre múltiplas variantes com pesos configuráveis, permitindo testes A/B de páginas de destino." },
      { title: "Variantes e pesos", content: "Cada Smart Link pode ter várias variantes com URL de destino e peso (%). Os pesos devem somar 100%." },
      { title: "Click ID", content: "A cada redirecionamento, um click_id único é gerado e passado via parâmetros UTM para a página de destino, permitindo atribuição de vendas." },
      { title: "Permissões", content: "• Visualizadores: apenas visualizam\n• Membros: podem criar e editar, exclusão requer aprovação de admin\n• Administradores: controle total" },
    ],
  },
  utmReport: {
    title: "Tutorial — Relatório UTM",
    sections: [
      { title: "Origem dos dados", content: "O relatório UTM agrupa dados de cliques e vendas por parâmetros UTM: Campaign, Medium, Content e Source." },
      { title: "Como interpretar", content: "Campaign identifica a campanha; Medium o canal; Content diferencia criativos; Source a origem do tráfego." },
      { title: "Exportação", content: "Exporte os dados em CSV ou Excel para análises externas." },
    ],
  },
  webhookLogs: {
    title: "Tutorial — Webhook Logs",
    sections: [
      { title: "Como funciona", content: "Quando uma venda é realizada, sua plataforma envia um webhook para a URL configurada. O sistema processa e tenta atribuir a venda a um click_id." },
      { title: "Status", content: "• approved: venda confirmada\n• duplicate: já processada\n• ignored: evento não relevante\n• error: falha no processamento\n• refunded/chargedback/canceled: estornos" },
      { title: "Atribuição", content: "Vendas com click_id válido são atribuídas ao Smart Link correspondente. Vendas sem click_id ficam como 'Não atribuído'." },
    ],
  },
  settings: {
    title: "Tutorial — Configurações",
    sections: [
      { title: "Projetos", content: "Crie e gerencie múltiplos projetos. Cada projeto possui Smart Links, webhooks e relatórios independentes." },
      { title: "Equipe e Papéis", content: "Convide membros com papéis diferenciados:\n• Visualizador: apenas visualização\n• Membro: criar e editar (exclusão requer aprovação)\n• Administrador: controle total\n• Owner: proprietário" },
      { title: "URL do Webhook", content: "Copie a URL do webhook e cole na configuração da sua plataforma de vendas. Cada projeto tem uma URL única." },
      { title: "Assinatura", content: "Gerencie seu plano e faça upgrade para desbloquear mais recursos. Super admins possuem acesso ao plano Ouro automaticamente." },
    ],
  },
};
