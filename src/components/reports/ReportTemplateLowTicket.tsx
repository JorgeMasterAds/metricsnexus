import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

// Editable cell - dark bg for manual input
function EditCell({ value, onChange, type = "number", step, className = "" }: { value: number | string; onChange: (v: any) => void; type?: string; step?: string; className?: string }) {
  return (
    <Input
      type={type}
      step={step}
      value={value}
      onChange={e => onChange(type === "number" ? +e.target.value : e.target.value)}
      className={`h-7 text-xs bg-muted/80 border-border/40 font-mono text-right ${className}`}
    />
  );
}

// Read-only cell
function ReadCell({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`h-7 flex items-center justify-end text-xs font-mono px-2 ${className}`}>{value}</div>;
}

function SectionHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-primary/10 text-primary text-[11px] font-bold px-3 py-1.5 ${className}`}>{children}</div>;
}

export default function ReportTemplateLowTicket() {
  // Inputs (dark cells = manually filled)
  const [orcamentoMensal, setOrcamentoMensal] = useState(4000);
  const [diasMes, setDiasMes] = useState(28);
  const [diaAtual, setDiaAtual] = useState(new Date().getDate());
  const [verbaMeta, setVerbaMeta] = useState(0);
  const [verbaGoogle, setVerbaGoogle] = useState(0);
  const [metaVendas, setMetaVendas] = useState(149);

  // Traffic metrics
  const [cpm, setCpm] = useState(24.54);
  const [ctr, setCtr] = useState(1.38);
  const [connectRate, setConnectRate] = useState(73.65);
  const [txConvPaginaCompra, setTxConvPaginaCompra] = useState(9.0);

  // Low Ticket
  const [ltNome, setLtNome] = useState("VTDW");
  const [ltTicket, setLtTicket] = useState(26);
  const [ltVendas, setLtVendas] = useState(29);
  const [lt2Nome, setLt2Nome] = useState("VTDW");
  const [lt2Ticket, setLt2Ticket] = useState(17);
  const [lt2Vendas, setLt2Vendas] = useState(0);

  // Order bumps
  const [ob1Nome, setOb1Nome] = useState("Reuniões Essenciais de Vendas");
  const [ob1Ticket, setOb1Ticket] = useState(35);
  const [ob1Vendas, setOb1Vendas] = useState(3);
  const [ob2Nome, setOb2Nome] = useState("Prospecção DTV");
  const [ob2Ticket, setOb2Ticket] = useState(26);
  const [ob2Vendas, setOb2Vendas] = useState(6);
  const [ob3Nome, setOb3Nome] = useState("Diário de Bordo e Ferramenta de Aceleração");
  const [ob3Ticket, setOb3Ticket] = useState(17);
  const [ob3Vendas, setOb3Vendas] = useState(4);

  // Upsell / Produto Principal
  const [upsellVendas, setUpsellVendas] = useState(0);
  const [ppVendas, setPpVendas] = useState(0);
  const [pp2Vendas, setPp2Vendas] = useState(0);
  const [pp3Vendas, setPp3Vendas] = useState(0);

  // Page access
  const [acessosPagina, setAcessosPagina] = useState(313);
  const [acessosCheckout, setAcessosCheckout] = useState(67);

  // PP page access
  const [ppAcessosPagina, setPpAcessosPagina] = useState(0);
  const [ppAcessosCheckout, setPpAcessosCheckout] = useState(0);

  // Investment
  const [investimentoGasto, setInvestimentoGasto] = useState(748);

  // Reembolsos
  const [reembolsosLT, setReembolsosLT] = useState(0);
  const [reembolsosOB, setReembolsosOB] = useState(0);
  const [reembolsosPP, setReembolsosPP] = useState(0);

  const c = useMemo(() => {
    const orcSemanal = orcamentoMensal / 4;
    const orcDiario = orcamentoMensal / diasMes;
    const diasRestantes = Math.max(0, diasMes - diaAtual);

    const fatLT = ltVendas * ltTicket;
    const fatLT2 = lt2Vendas * lt2Ticket;
    const fatOB1 = ob1Vendas * ob1Ticket;
    const fatOB2 = ob2Vendas * ob2Ticket;
    const fatOB3 = ob3Vendas * ob3Ticket;

    const totalVendasLT = ltVendas + lt2Vendas;
    const totalLT = fatLT + fatLT2;
    const totalOB = fatOB1 + fatOB2 + fatOB3;
    const totalFunil = totalLT + totalOB;

    // Running total column
    const runLT = fatLT;
    const runLT2 = runLT + fatLT2;
    const runOB1 = runLT2 + fatOB1;
    const runOB2 = runOB1 + fatOB2;
    const runOB3 = runOB2 + fatOB3;

    // Conversions from LT base
    const convOB1 = totalVendasLT > 0 ? (ob1Vendas / totalVendasLT) * 100 : 0;
    const convOB2 = totalVendasLT > 0 ? (ob2Vendas / totalVendasLT) * 100 : 0;
    const convOB3 = totalVendasLT > 0 ? (ob3Vendas / totalVendasLT) * 100 : 0;
    const convLT = acessosPagina > 0 ? (ltVendas / acessosPagina) * 100 : 0;

    const roas = investimentoGasto > 0 ? totalFunil / investimentoGasto : 0;

    // LT metrics
    const ticketMedioLT = totalVendasLT > 0 ? totalLT / totalVendasLT : 0;
    const cac = totalVendasLT > 0 ? investimentoGasto / totalVendasLT : 0;
    const convPagCheckout = acessosPagina > 0 ? (acessosCheckout / acessosPagina) * 100 : 0;
    const convCheckoutCompra = acessosCheckout > 0 ? (ltVendas / acessosCheckout) * 100 : 0;
    const convPagCompra = acessosPagina > 0 ? (ltVendas / acessosPagina) * 100 : 0;

    // PP metrics
    const ppConvPagCheckout = ppAcessosPagina > 0 ? (ppAcessosCheckout / ppAcessosPagina) * 100 : 0;
    const ppConvCheckoutCompra = ppAcessosCheckout > 0 ? (ppVendas / ppAcessosCheckout) * 100 : 0;
    const ppConvPagCompra = ppAcessosPagina > 0 ? (ppVendas / ppAcessosPagina) * 100 : 0;
    const ppCac = ppVendas > 0 ? investimentoGasto / ppVendas : 0;
    const ppTicketMedio = ppVendas > 0 ? 0 / ppVendas : 0; // No PP ticket defined

    // Simulação mensal
    const previsaoCPA = totalVendasLT > 0 ? investimentoGasto / totalVendasLT : 0;
    const previsaoVendas = diasMes > 0 && diaAtual > 0 ? (totalVendasLT / diaAtual) * diasMes : 0;
    const ticketMedioSim = totalVendasLT > 0 ? totalLT / totalVendasLT : 0;
    const fatSim = previsaoVendas * ticketMedioSim;
    const roasSim = orcamentoMensal > 0 ? fatSim / orcamentoMensal : 0;
    const convGeralLWPP = 0; // LW > PP conversion
    const previsaoCAC_PP = 0;
    const previsaoVendasPP = 0;
    const fatPPSim = 0;
    const fatTotalSim = fatSim + fatPPSim;
    const liquidoSim = fatTotalSim - orcamentoMensal;

    // Resultados
    const diasVendas = diaAtual;
    const vendasMediaDia = diasVendas > 0 ? totalVendasLT / diasVendas : 0;
    const faltouInvestir = orcamentoMensal - investimentoGasto;
    const percentMeta = metaVendas > 0 ? (totalVendasLT / metaVendas) * 100 : 0;

    // Tráfego
    const totalVendasAll = ltVendas + lt2Vendas + ob1Vendas + ob2Vendas + ob3Vendas;
    const trafegoPago = totalVendasAll;
    const trafegoOrganico = 0;

    // Reembolso rates
    const taxaReembolsoLT = totalVendasLT > 0 ? (reembolsosLT / totalVendasLT) * 100 : 0;
    const totalOBVendas = ob1Vendas + ob2Vendas + ob3Vendas;
    const taxaReembolsoOB = totalOBVendas > 0 ? (reembolsosOB / totalOBVendas) * 100 : 0;
    const taxaReembolsoPP = ppVendas > 0 ? (reembolsosPP / ppVendas) * 100 : 0;

    // CPM calc
    const impressoes = investimentoGasto > 0 && cpm > 0 ? (investimentoGasto / cpm) * 1000 : 0;
    const cliques = impressoes > 0 ? impressoes * (ctr / 100) : 0;
    const cpc = cliques > 0 ? investimentoGasto / cliques : 0;

    return {
      orcSemanal, orcDiario, diasRestantes,
      fatLT, fatLT2, fatOB1, fatOB2, fatOB3, totalLT, totalOB, totalFunil,
      runLT, runLT2, runOB1, runOB2, runOB3,
      convOB1, convOB2, convOB3, convLT,
      roas, ticketMedioLT, cac,
      convPagCheckout, convCheckoutCompra, convPagCompra,
      ppConvPagCheckout, ppConvCheckoutCompra, ppConvPagCompra, ppCac, ppTicketMedio,
      previsaoCPA, previsaoVendas, ticketMedioSim, fatSim, roasSim, fatTotalSim, liquidoSim,
      diasVendas, vendasMediaDia, faltouInvestir, percentMeta,
      trafegoPago, trafegoOrganico, totalVendasAll, totalVendasLT,
      taxaReembolsoLT, taxaReembolsoOB, taxaReembolsoPP,
      impressoes, cliques, cpc,
    };
  }, [orcamentoMensal, diasMes, diaAtual, cpm, ctr, connectRate, txConvPaginaCompra, ltTicket, ltVendas, lt2Ticket, lt2Vendas, ob1Ticket, ob1Vendas, ob2Ticket, ob2Vendas, ob3Ticket, ob3Vendas, acessosPagina, acessosCheckout, ppAcessosPagina, ppAcessosCheckout, ppVendas, investimentoGasto, metaVendas, reembolsosLT, reembolsosOB, reembolsosPP]);

  const Row = ({ label, value, editable, editValue, onChange, step, highlight, className = "" }: any) => (
    <div className={`flex items-center border-b border-border/20 ${highlight ? "bg-primary/5" : ""} ${className}`}>
      <div className="flex-1 text-[11px] px-2 py-1 text-muted-foreground">{label}</div>
      <div className="w-28 text-right">
        {editable ? (
          <EditCell value={editValue ?? value} onChange={onChange} step={step} />
        ) : (
          <ReadCell value={String(value)} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Template LowTicket / Lançamento Pago</h2>
        <p className="text-[11px] text-muted-foreground">Campos com fundo escuro são editáveis manualmente. Os demais são calculados automaticamente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* COL 1: Planejamento + Simulação */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Planejamento Investimento de Tráfego</SectionHeader>
            <Row label="Orçamento Mensal" editable editValue={orcamentoMensal} onChange={setOrcamentoMensal} value={fmt(orcamentoMensal)} />
            <Row label="Orçamento Semanal" value={fmt(c.orcSemanal)} />
            <Row label="Orçamento Diário" value={fmt(c.orcDiario)} />
            <Row label="Verba Meta Ads" editable editValue={verbaMeta} onChange={setVerbaMeta} value={fmt(verbaMeta)} highlight />
            <Row label="Verba Google/YT" editable editValue={verbaGoogle} onChange={setVerbaGoogle} value={fmt(verbaGoogle)} highlight />
            <Row label="Dia Atual" editable editValue={diaAtual} onChange={setDiaAtual} value={diaAtual} />
            <Row label="Total de Dias do Mês" editable editValue={diasMes} onChange={setDiasMes} value={diasMes} />
            <Row label="Dias Restantes" value={c.diasRestantes} />
          </div>

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Simulação | Mensal</SectionHeader>
            <Row label="CPM" editable editValue={cpm} onChange={setCpm} step="0.01" value={fmt(cpm)} />
            <Row label="CTR" editable editValue={ctr} onChange={setCtr} step="0.01" value={`${ctr}%`} />
            <Row label="Connect Rate" editable editValue={connectRate} onChange={setConnectRate} step="0.01" value={`${connectRate}%`} />
            <Row label="Tx. Conversão | Página > Compra" editable editValue={txConvPaginaCompra} onChange={setTxConvPaginaCompra} step="0.01" value={`${txConvPaginaCompra}%`} />
            <Row label="Previsão de CPA" value={fmt(c.previsaoCPA)} />
            <Row label="Previsão de Vendas" value={c.previsaoVendas.toFixed(1)} />
            <Row label="Ticket Médio" value={fmt(c.ticketMedioSim)} />
            <Row label="Faturamento" value={fmt(c.fatSim)} />
            <Row label="ROAS" value={c.roasSim.toFixed(2)} />
            <Row label="Faturamento Total" value={fmt(c.fatTotalSim)} />
            <Row label="Líquido" value={fmt(c.liquidoSim)} className={c.liquidoSim < 0 ? "text-destructive" : ""} />
            <Row label="ROAS" value={c.roasSim.toFixed(2)} />
          </div>
        </div>

        {/* COL 2: Funil 8 - Tráfego Pago */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>FUNIL 8 - Tráfego Pago</SectionHeader>
            {/* Header */}
            <div className="grid grid-cols-6 text-[10px] font-bold text-muted-foreground border-b border-border/30 bg-muted/30">
              <div className="px-2 py-1 col-span-1"></div>
              <div className="px-1 py-1 text-center">Nome</div>
              <div className="px-1 py-1 text-right">Ticket</div>
              <div className="px-1 py-1 text-right">Conv.</div>
              <div className="px-1 py-1 text-right">Vendas</div>
              <div className="px-1 py-1 text-right">Faturamento</div>
            </div>
            {/* LOW TICKET */}
            {[
              { label: "LOW TICKET", nome: ltNome, setNome: setLtNome, ticket: ltTicket, setTicket: setLtTicket, vendas: ltVendas, setVendas: setLtVendas, conv: c.convLT, fat: c.fatLT, run: c.runLT },
              { label: "LOW TICKET OFERTA 2", nome: lt2Nome, setNome: setLt2Nome, ticket: lt2Ticket, setTicket: setLt2Ticket, vendas: lt2Vendas, setVendas: setLt2Vendas, conv: 0, fat: c.fatLT2, run: c.runLT2 },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
                <div className="px-2 py-0.5 font-medium text-[10px]">{row.label}</div>
                <div className="px-1"><EditCell value={row.nome} onChange={row.setNome} type="text" className="text-left text-[10px]" /></div>
                <div className="px-1"><EditCell value={row.ticket} onChange={row.setTicket} step="0.01" /></div>
                <ReadCell value={`${row.conv.toFixed(2)}%`} />
                <div className="px-1"><EditCell value={row.vendas} onChange={row.setVendas} /></div>
                <ReadCell value={fmt(row.fat)} />
              </div>
            ))}
            {/* ORDER BUMPS */}
            {[
              { label: "ORDERBUMP 1", nome: ob1Nome, setNome: setOb1Nome, ticket: ob1Ticket, setTicket: setOb1Ticket, vendas: ob1Vendas, setVendas: setOb1Vendas, conv: c.convOB1, fat: c.fatOB1, run: c.runOB1 },
              { label: "ORDERBUMP 2", nome: ob2Nome, setNome: setOb2Nome, ticket: ob2Ticket, setTicket: setOb2Ticket, vendas: ob2Vendas, setVendas: setOb2Vendas, conv: c.convOB2, fat: c.fatOB2, run: c.runOB2 },
              { label: "ORDERBUMP 3", nome: ob3Nome, setNome: setOb3Nome, ticket: ob3Ticket, setTicket: setOb3Ticket, vendas: ob3Vendas, setVendas: setOb3Vendas, conv: c.convOB3, fat: c.fatOB3, run: c.runOB3 },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
                <div className="px-2 py-0.5 font-medium text-[10px]">{row.label}</div>
                <div className="px-1"><EditCell value={row.nome} onChange={row.setNome} type="text" className="text-left text-[10px]" /></div>
                <div className="px-1"><EditCell value={row.ticket} onChange={row.setTicket} step="0.01" /></div>
                <ReadCell value={`${row.conv.toFixed(2)}%`} />
                <div className="px-1"><EditCell value={row.vendas} onChange={row.setVendas} /></div>
                <ReadCell value={fmt(row.fat)} />
              </div>
            ))}
            {/* UPSELL, PP rows */}
            {["UPSELL", "PRODUTO PRINCIPAL", "PRODUTO PRINCIPAL OFERTA 2", "PRODUTO PRINCIPAL OFERTA 3"].map((label, i) => (
              <div key={label} className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
                <div className="px-2 py-0.5 font-medium text-[10px]">{label}</div>
                <div className="px-1"></div>
                <div className="px-1"></div>
                <ReadCell value="0,00%" />
                <div className="px-1"><EditCell value={i === 0 ? upsellVendas : i === 1 ? ppVendas : i === 2 ? pp2Vendas : pp3Vendas} onChange={i === 0 ? setUpsellVendas : i === 1 ? setPpVendas : i === 2 ? setPp2Vendas : setPp3Vendas} /></div>
                <ReadCell value={fmt(0)} />
              </div>
            ))}
            {/* Conversão Geral */}
            <div className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center bg-primary/10">
              <div className="px-2 py-1 font-bold text-[10px] text-primary col-span-3">Conversão Geral Produto Principal</div>
              <ReadCell value="0,00%" />
              <ReadCell value="0" />
              <ReadCell value={fmt(c.totalFunil)} className="font-bold" />
            </div>
          </div>

          {/* Low Ticket + Produto Principal side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <SectionHeader>Low Ticket</SectionHeader>
              <Row label="Ticket Médio" value={fmt(c.ticketMedioLT)} />
              <Row label="Acessos a Página" editable editValue={acessosPagina} onChange={setAcessosPagina} value={acessosPagina} />
              <Row label="Acessos a Checkout" editable editValue={acessosCheckout} onChange={setAcessosCheckout} value={acessosCheckout} />
              <Row label="CAC" value={fmt(c.cac)} highlight />
              <Row label="Tx. Conv. Página > Checkout" value={`${c.convPagCheckout.toFixed(0)}%`} />
              <Row label="Tx. Conv. Checkout > Compra" value={`${c.convCheckoutCompra.toFixed(0)}%`} />
              <Row label="Tx. Conv. Página > Compra" value={`${c.convPagCompra.toFixed(0)}%`} />
              <Row label="CTR Médio" value={`${ctr.toFixed(2)}%`} />
              <Row label="CPM Médio" value={fmt(cpm)} />
              <Row label="Connect Rate" value={`${connectRate.toFixed(2)}%`} />
            </div>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <SectionHeader>Produto Principal</SectionHeader>
              <Row label="Ticket Médio" value="-" />
              <Row label="Acessos a Página" editable editValue={ppAcessosPagina} onChange={setPpAcessosPagina} value={ppAcessosPagina} />
              <Row label="Acessos a Checkout" editable editValue={ppAcessosCheckout} onChange={setPpAcessosCheckout} value={ppAcessosCheckout} />
              <Row label="CAC" value="-" />
              <Row label="Tx. Conv. Página > Checkout" value={ppAcessosPagina > 0 ? `${c.ppConvPagCheckout.toFixed(0)}%` : "-"} />
              <Row label="Tx. Conv. Checkout > Compra" value={ppAcessosCheckout > 0 ? `${c.ppConvCheckoutCompra.toFixed(0)}%` : "-"} />
              <Row label="Tx. Conv. Página > Compra" value={ppAcessosPagina > 0 ? `${c.ppConvPagCompra.toFixed(0)}%` : "-"} />
            </div>
          </div>

          {/* Tráfego */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Tráfego</SectionHeader>
            <div className="grid grid-cols-3 text-[10px] font-bold text-muted-foreground border-b border-border/30 bg-muted/30 px-2 py-1">
              <div></div><div className="text-right">%</div><div className="text-right">Qtd. Vendas</div>
            </div>
            <div className="grid grid-cols-3 text-[11px] border-b border-border/20 px-2 py-1">
              <div>Tráfego Pago</div>
              <div className="text-right">100,00%</div>
              <div className="text-right font-bold">{c.totalVendasAll}</div>
            </div>
            <div className="grid grid-cols-3 text-[11px] px-2 py-1">
              <div>Orgânico</div>
              <div className="text-right">0,00%</div>
              <div className="text-right">0</div>
            </div>
          </div>
        </div>

        {/* COL 3: Resultados + Meta + Reembolsos */}
        <div className="space-y-4">
          {/* Resultados das Vendas */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Resultados das Vendas - Tráfego Pago</SectionHeader>
            <div className="grid grid-cols-2 gap-3 p-3">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Investimento Total</p>
                <p className="text-lg font-bold">{fmt(investimentoGasto)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Faturamento Total</p>
                <p className="text-lg font-bold">{fmt(c.totalFunil)}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pb-3">
              <span className="text-[10px] text-muted-foreground">ROAS</span>
              <span className="text-xl font-bold">{c.roas.toFixed(2)}</span>
              <StatusBadge value={c.roas} thresholds={{ bad: 1.0, ok: 1.2, good: 1.6 }} />
            </div>
          </div>

          {/* Meta de Vendas */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Meta de Vendas do Mês</SectionHeader>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <EditCell value={metaVendas} onChange={setMetaVendas} className="w-20 text-center" />
              </div>
              <div className="text-2xl font-bold">{c.totalVendasLT} <span className="text-sm text-muted-foreground font-normal">/ {metaVendas}</span></div>
              <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${Math.min(c.percentMeta, 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{c.percentMeta.toFixed(0)}% da meta</p>
            </div>
          </div>

          {/* Resultados */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Resultados</SectionHeader>
            <Row label="Faturamento" value={fmt(c.totalFunil)} highlight />
            <Row label="Investimento" editable editValue={investimentoGasto} onChange={setInvestimentoGasto} value={fmt(investimentoGasto)} />
            <Row label="ROAS" value={c.roas.toFixed(2)} />
            <Row label="Conversão Geral | Tx. LW > PP" value="0%" />
            <Row label="Dias de Vendas" value={c.diasVendas} />
            <Row label="Vendas Média Por Dia" value={c.vendasMediaDia.toFixed(1)} />
            <Row label="Faltou Investir do Planejamento" value={fmt(c.faltouInvestir)} />
          </div>

          {/* Funil 8 - Reembolsos */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <SectionHeader>Funil 8</SectionHeader>
            <div className="border-b border-border/20 px-2 py-1 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Reembolsos/Chargeback (LT)</span>
              <div className="w-16"><EditCell value={reembolsosLT} onChange={setReembolsosLT} /></div>
            </div>
            <div className="border-b border-border/20 px-2 py-1 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Taxa de Reembolso (LT)</span>
              <ReadCell value={`${c.taxaReembolsoLT.toFixed(2)}%`} />
            </div>
            <div className="bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary">Orderbumps</div>
            <div className="border-b border-border/20 px-2 py-1 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Reembolsos/Chargeback</span>
              <div className="w-16"><EditCell value={reembolsosOB} onChange={setReembolsosOB} /></div>
            </div>
            <div className="border-b border-border/20 px-2 py-1 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Taxa de Reembolso</span>
              <ReadCell value={`${c.taxaReembolsoOB.toFixed(2)}%`} />
            </div>
            <div className="bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary">Produto Principal</div>
            <div className="border-b border-border/20 px-2 py-1 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Reembolsos/Chargeback</span>
              <div className="w-16"><EditCell value={reembolsosPP} onChange={setReembolsosPP} /></div>
            </div>
            <div className="px-2 py-1 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Taxa de Reembolso</span>
              <ReadCell value={`${c.taxaReembolsoPP.toFixed(2)}%`} />
            </div>
          </div>
        </div>
      </div>

      {/* Calculadora CPM */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <SectionHeader className="flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5" />
          Calculadora de CPM
        </SectionHeader>
        <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Impressões</p>
              <p className="text-sm font-bold">{c.impressoes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Cliques</p>
              <p className="text-sm font-bold">{c.cliques.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">CPC</p>
              <p className="text-sm font-bold">{fmt(c.cpc)}</p>
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
        </div>
      </div>

      {/* Referência de Métricas */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <SectionHeader>Referência de Métricas (Funil LowTicket)</SectionHeader>
        <div className="p-3 overflow-x-auto">
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
      </div>
    </div>
  );
}
