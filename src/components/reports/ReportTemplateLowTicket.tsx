import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp, DollarSign, Target, BarChart3, Percent, Users, Eye, ShoppingCart, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function StatusBadge({ value, thresholds }: { value: number; thresholds: { bad: number; ok: number; good: number; invert?: boolean } }) {
  const { bad, ok, good, invert } = thresholds;
  let color: string;
  let label: string;

  if (invert) {
    if (value > bad) { color = "bg-red-500/20 text-red-400 border-red-500/30"; label = "Ruim"; }
    else if (value > ok) { color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"; label = "Aceitável"; }
    else if (value > good) { color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"; label = "Bom"; }
    else { color = "bg-blue-500/20 text-blue-400 border-blue-500/30"; label = "Excelente"; }
  } else {
    if (value < bad) { color = "bg-red-500/20 text-red-400 border-red-500/30"; label = "Ruim"; }
    else if (value < ok) { color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"; label = "Aceitável"; }
    else if (value < good) { color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"; label = "Bom"; }
    else { color = "bg-blue-500/20 text-blue-400 border-blue-500/30"; label = "Excelente"; }
  }

  return <Badge variant="outline" className={`${color} text-[10px] font-medium`}>{label}</Badge>;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default function ReportTemplateLowTicket() {
  // Investment planning inputs
  const [orcamentoMensal, setOrcamentoMensal] = useState(4000);
  const [diasMes, setDiasMes] = useState(28);
  const [diaAtual, setDiaAtual] = useState(new Date().getDate());
  const [metaVendas, setMetaVendas] = useState(149);

  // Traffic metrics
  const [cpm, setCpm] = useState(24.54);
  const [ctr, setCtr] = useState(1.38);
  const [connectRate, setConnectRate] = useState(73.65);

  // Low Ticket
  const [ticketLT, setTicketLT] = useState(26);
  const [acessosPagina, setAcessosPagina] = useState(313);
  const [acessosCheckout, setAcessosCheckout] = useState(67);
  const [vendasLT, setVendasLT] = useState(29);

  // Order bumps
  const [ob1Ticket, setOb1Ticket] = useState(35);
  const [ob1Vendas, setOb1Vendas] = useState(3);
  const [ob2Ticket, setOb2Ticket] = useState(26);
  const [ob2Vendas, setOb2Vendas] = useState(6);
  const [ob3Ticket, setOb3Ticket] = useState(17);
  const [ob3Vendas, setOb3Vendas] = useState(4);

  // Investment spent
  const [investimentoGasto, setInvestimentoGasto] = useState(748);

  const computed = useMemo(() => {
    const orcSemanal = orcamentoMensal / 4;
    const orcDiario = orcamentoMensal / diasMes;
    const diasRestantes = Math.max(0, diasMes - diaAtual);

    // Low Ticket revenue
    const faturamentoLT = vendasLT * ticketLT;

    // Order bumps
    const faturamentoOB1 = ob1Vendas * ob1Ticket;
    const faturamentoOB2 = ob2Vendas * ob2Ticket;
    const faturamentoOB3 = ob3Vendas * ob3Ticket;
    const faturamentoOBTotal = faturamentoOB1 + faturamentoOB2 + faturamentoOB3;

    // Total revenue
    const faturamentoTotal = faturamentoLT + faturamentoOBTotal;

    // ROAS
    const roas = investimentoGasto > 0 ? faturamentoTotal / investimentoGasto : 0;

    // Conversion rates
    const convPaginaCheckout = acessosPagina > 0 ? acessosCheckout / acessosPagina : 0;
    const convCheckoutCompra = acessosCheckout > 0 ? vendasLT / acessosCheckout : 0;
    const convPaginaCompra = acessosPagina > 0 ? vendasLT / acessosPagina : 0;
    const convGeralOB = vendasLT > 0 ? (ob1Vendas + ob2Vendas + ob3Vendas) / vendasLT : 0;

    // CAC
    const cac = vendasLT > 0 ? investimentoGasto / vendasLT : 0;

    // Ticket Médio geral
    const totalVendas = vendasLT + ob1Vendas + ob2Vendas + ob3Vendas;
    const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;

    // CPM Calculator
    const impressoes = investimentoGasto > 0 && cpm > 0 ? (investimentoGasto / cpm) * 1000 : 0;
    const cliques = impressoes > 0 ? impressoes * (ctr / 100) : 0;
    const cpc = cliques > 0 ? investimentoGasto / cliques : 0;
    const cpaCalculado = vendasLT > 0 ? investimentoGasto / vendasLT : 0;

    // Projeção mensal
    const diasVendas = diaAtual;
    const vendasMediaDia = diasVendas > 0 ? vendasLT / diasVendas : 0;
    const previsaoVendas = vendasMediaDia * diasMes;
    const previsaoFaturamento = previsaoVendas * ticketLT;
    const previsaoROAS = orcamentoMensal > 0 ? previsaoFaturamento / orcamentoMensal : 0;
    const faltouInvestir = orcamentoMensal - investimentoGasto;
    const percentMeta = metaVendas > 0 ? (vendasLT / metaVendas) * 100 : 0;

    return {
      orcSemanal, orcDiario, diasRestantes,
      faturamentoLT, faturamentoOB1, faturamentoOB2, faturamentoOB3, faturamentoOBTotal,
      faturamentoTotal, roas,
      convPaginaCheckout, convCheckoutCompra, convPaginaCompra, convGeralOB,
      cac, ticketMedio,
      impressoes, cliques, cpc, cpaCalculado,
      vendasMediaDia, previsaoVendas, previsaoFaturamento, previsaoROAS, faltouInvestir,
      percentMeta, diasVendas,
    };
  }, [orcamentoMensal, diasMes, diaAtual, metaVendas, cpm, ctr, connectRate, ticketLT, acessosPagina, acessosCheckout, vendasLT, ob1Ticket, ob1Vendas, ob2Ticket, ob2Vendas, ob3Ticket, ob3Vendas, investimentoGasto]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Template LowTicket / Lançamento Pago</h2>
          <p className="text-xs text-muted-foreground">Planejamento e análise de funil com tráfego pago</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Planejamento de Investimento */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Planejamento de Investimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Orçamento Mensal</Label>
                <Input type="number" value={orcamentoMensal} onChange={e => setOrcamentoMensal(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Dias do Mês</Label>
                <Input type="number" value={diasMes} onChange={e => setDiasMes(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Dia Atual</Label>
                <Input type="number" value={diaAtual} onChange={e => setDiaAtual(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Investimento Gasto</Label>
                <Input type="number" value={investimentoGasto} onChange={e => setInvestimentoGasto(+e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Orçamento Semanal</span><span className="font-medium">{fmt(computed.orcSemanal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Orçamento Diário</span><span className="font-medium">{fmt(computed.orcDiario)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dias Restantes</span><span className="font-medium">{computed.diasRestantes}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Faltou Investir</span><span className="font-medium text-yellow-400">{fmt(computed.faltouInvestir)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Meta de Vendas */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Meta de Vendas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-[10px] text-muted-foreground">Meta (vendas)</Label>
              <Input type="number" value={metaVendas} onChange={e => setMetaVendas(+e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">{vendasLT} <span className="text-sm text-muted-foreground font-normal">/ {metaVendas}</span></div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${Math.min(computed.percentMeta, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{computed.percentMeta.toFixed(1)}% da meta</p>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Dias de Vendas</span><span className="font-medium">{computed.diasVendas}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vendas Média/Dia</span><span className="font-medium">{computed.vendasMediaDia.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Previsão de Vendas</span><span className="font-medium">{computed.previsaoVendas.toFixed(0)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Faturamento</span><span className="font-bold text-base">{fmt(computed.faturamentoTotal)}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Investimento</span><span className="font-medium">{fmt(investimentoGasto)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ROAS</span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-lg">{computed.roas.toFixed(2)}</span>
                <StatusBadge value={computed.roas} thresholds={{ bad: 1.0, ok: 1.2, good: 1.6 }} />
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between"><span className="text-muted-foreground">Ticket Médio</span><span className="font-medium">{fmt(computed.ticketMedio)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CAC</span><span className="font-medium">{fmt(computed.cac)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">CPA</span>
              <span className="flex items-center gap-2">
                <span className="font-medium">{fmt(computed.cpaCalculado)}</span>
                <StatusBadge value={computed.cpaCalculado / ticketLT} thresholds={{ bad: 1, ok: 1, good: 0.7, invert: true }} />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculadora CPM */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Calculadora de CPM
            <InfoTip text="CPM = Custo por Mil Impressões. Insira os dados de tráfego para calcular métricas de desempenho de anúncios." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <Label className="text-[10px] text-muted-foreground">CPM (R$)</Label>
              <Input type="number" step="0.01" value={cpm} onChange={e => setCpm(+e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">CTR (%)</Label>
              <Input type="number" step="0.01" value={ctr} onChange={e => setCtr(+e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Connect Rate (%)</Label>
              <Input type="number" step="0.01" value={connectRate} onChange={e => setConnectRate(+e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Investimento (R$)</Label>
              <Input type="number" value={investimentoGasto} onChange={e => setInvestimentoGasto(+e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Impressões</p>
              <p className="text-sm font-bold">{computed.impressoes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Cliques</p>
              <p className="text-sm font-bold">{computed.cliques.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">CPC</p>
              <p className="text-sm font-bold">{fmt(computed.cpc)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1">CPM <StatusBadge value={cpm} thresholds={{ bad: 50, ok: 35, good: 25, invert: true }} /></p>
              <p className="text-sm font-bold">{fmt(cpm)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1">CTR <StatusBadge value={ctr} thresholds={{ bad: 1.0, ok: 1.4, good: 2.0 }} /></p>
              <p className="text-sm font-bold">{ctr.toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Ticket */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Low Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Ticket (R$)</Label>
                <Input type="number" step="0.01" value={ticketLT} onChange={e => setTicketLT(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Vendas</Label>
                <Input type="number" value={vendasLT} onChange={e => setVendasLT(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Acessos Página</Label>
                <Input type="number" value={acessosPagina} onChange={e => setAcessosPagina(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Acessos Checkout</Label>
                <Input type="number" value={acessosCheckout} onChange={e => setAcessosCheckout(+e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Faturamento LT</span><span className="font-medium">{fmt(computed.faturamentoLT)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conv. Página → Checkout</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{pct(computed.convPaginaCheckout)}</span>
                  <StatusBadge value={computed.convPaginaCheckout * 100} thresholds={{ bad: 25, ok: 35, good: 50 }} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conv. Checkout → Compra</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{pct(computed.convCheckoutCompra)}</span>
                  <StatusBadge value={computed.convCheckoutCompra * 100} thresholds={{ bad: 15, ok: 20, good: 30 }} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conv. Página → Compra</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{pct(computed.convPaginaCompra)}</span>
                  <StatusBadge value={computed.convPaginaCompra * 100} thresholds={{ bad: 5, ok: 7, good: 10 }} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Connect Rate</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{connectRate.toFixed(2)}%</span>
                  <StatusBadge value={connectRate} thresholds={{ bad: 65, ok: 75, good: 85 }} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Bumps */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Order Bumps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Order Bump 1", ticket: ob1Ticket, setTicket: setOb1Ticket, vendas: ob1Vendas, setVendas: setOb1Vendas, fat: computed.faturamentoOB1 },
              { label: "Order Bump 2", ticket: ob2Ticket, setTicket: setOb2Ticket, vendas: ob2Vendas, setVendas: setOb2Vendas, fat: computed.faturamentoOB2 },
              { label: "Order Bump 3", ticket: ob3Ticket, setTicket: setOb3Ticket, vendas: ob3Vendas, setVendas: setOb3Vendas, fat: computed.faturamentoOB3 },
            ].map((ob, i) => (
              <div key={i}>
                <p className="text-[10px] font-medium text-muted-foreground mb-1">{ob.label}</p>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Ticket</Label>
                    <Input type="number" step="0.01" value={ob.ticket} onChange={e => ob.setTicket(+e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Vendas</Label>
                    <Input type="number" value={ob.vendas} onChange={e => ob.setVendas(+e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium">{fmt(ob.fat)}</span>
                    {vendasLT > 0 && <span className="text-[10px] text-muted-foreground ml-1">({((ob.vendas / vendasLT) * 100).toFixed(1)}%)</span>}
                  </div>
                </div>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Order Bumps</span>
              <span className="font-bold">{fmt(computed.faturamentoOBTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referência de Métricas */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Referência de Métricas (Funil LowTicket)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 text-muted-foreground font-medium">Métrica</th>
                  <th className="text-center py-2 text-red-400 font-medium">Ruim</th>
                  <th className="text-center py-2 text-yellow-400 font-medium">Aceitável</th>
                  <th className="text-center py-2 text-emerald-400 font-medium">Bom</th>
                  <th className="text-center py-2 text-blue-400 font-medium">Excelente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {[
                  { name: "CPM", bad: "> R$50", ok: "R$35–50", good: "R$25–35", excellent: "< R$25" },
                  { name: "CTR", bad: "< 1,0%", ok: "1,0–1,4%", good: "1,5–2,0%", excellent: "> 2,0%" },
                  { name: "Connect Rate", bad: "< 65%", ok: "65–75%", good: "75–85%", excellent: "> 85%" },
                  { name: "Conv. Página → Checkout", bad: "< 25%", ok: "25–35%", good: "35–50%", excellent: "> 50%" },
                  { name: "Conv. Checkout → Compra", bad: "< 15%", ok: "15–20%", good: "20–30%", excellent: "> 30%" },
                  { name: "Conv. Página → Compra", bad: "< 5%", ok: "5–7%", good: "7–10%", excellent: "> 10%" },
                  { name: "CPA (Low Ticket)", bad: "> Ticket", ok: "≈ Ticket", good: "< Ticket", excellent: "≤ 70% Ticket" },
                  { name: "ROAS", bad: "< 1.0", ok: "1.0–1.2", good: "1.2–1.6", excellent: "> 1.6" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2 text-center text-red-400">{row.bad}</td>
                    <td className="py-2 text-center text-yellow-400">{row.ok}</td>
                    <td className="py-2 text-center text-emerald-400">{row.good}</td>
                    <td className="py-2 text-center text-blue-400">{row.excellent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
