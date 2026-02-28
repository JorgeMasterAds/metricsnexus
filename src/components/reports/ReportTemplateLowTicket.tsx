import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";

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

const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STORAGE_KEY = "lowticket-template-data";

function usePersistedState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (key in parsed) return parsed[key];
      }
    } catch {}
    return initial;
  });
  return [value, setValue];
}

function EditCell({ value, onChange, type = "number", step, className = "" }: { value: number | string; onChange: (v: any) => void; type?: string; step?: string; className?: string }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const raw = e.target.value.replace(/[^\d.,\-]/g, "").replace(",", ".");
      const num = parseFloat(raw);
      onChange(isNaN(num) ? 0 : num);
    } else {
      onChange(e.target.value);
    }
  };

  const displayValue = type === "number" && typeof value === "number"
    ? value.toLocaleString("pt-BR")
    : value;

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={`h-7 text-xs bg-muted/80 border-border/40 font-mono text-right ${className}`}
    />
  );
}

function ReadCell({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`h-7 flex items-center justify-end text-xs font-mono px-2 ${className}`}>{value}</div>;
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/50">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value, editable, editValue, onChange, step, highlight, className = "" }: any) {
  return (
    <div className={`flex items-center border-b border-border/20 last:border-b-0 ${highlight ? "bg-accent/30" : ""} ${className}`}>
      <div className="flex-1 text-[11px] px-3 py-1.5 text-muted-foreground">{label}</div>
      <div className="w-28 text-right pr-1">
        {editable ? (
          <EditCell value={editValue ?? value} onChange={onChange} step={step} />
        ) : (
          <ReadCell value={String(value)} />
        )}
      </div>
    </div>
  );
}

export default function ReportTemplateLowTicket() {
  const [orcamentoMensal, setOrcamentoMensal] = usePersistedState("orcamentoMensal", 4000);
  const [diasMes, setDiasMes] = usePersistedState("diasMes", 28);
  const [diaAtual, setDiaAtual] = usePersistedState("diaAtual", new Date().getDate());
  const [verbaMeta, setVerbaMeta] = usePersistedState("verbaMeta", 0);
  const [verbaGoogle, setVerbaGoogle] = usePersistedState("verbaGoogle", 0);
  const [metaVendas, setMetaVendas] = usePersistedState("metaVendas", 149);
  const [cpm, setCpm] = usePersistedState("cpm", 24.54);
  const [ctr, setCtr] = usePersistedState("ctr", 1.38);
  const [connectRate, setConnectRate] = usePersistedState("connectRate", 73.65);
  const [txConvPaginaCompra, setTxConvPaginaCompra] = usePersistedState("txConvPaginaCompra", 9.0);
  const [ltNome, setLtNome] = usePersistedState("ltNome", "VTDW");
  const [ltTicket, setLtTicket] = usePersistedState("ltTicket", 26);
  const [ltVendas, setLtVendas] = usePersistedState("ltVendas", 29);
  const [lt2Nome, setLt2Nome] = usePersistedState("lt2Nome", "VTDW");
  const [lt2Ticket, setLt2Ticket] = usePersistedState("lt2Ticket", 17);
  const [lt2Vendas, setLt2Vendas] = usePersistedState("lt2Vendas", 0);
  const [ob1Nome, setOb1Nome] = usePersistedState("ob1Nome", "Reuniões Essenciais de Vendas");
  const [ob1Ticket, setOb1Ticket] = usePersistedState("ob1Ticket", 35);
  const [ob1Vendas, setOb1Vendas] = usePersistedState("ob1Vendas", 3);
  const [ob2Nome, setOb2Nome] = usePersistedState("ob2Nome", "Prospecção DTV");
  const [ob2Ticket, setOb2Ticket] = usePersistedState("ob2Ticket", 26);
  const [ob2Vendas, setOb2Vendas] = usePersistedState("ob2Vendas", 6);
  const [ob3Nome, setOb3Nome] = usePersistedState("ob3Nome", "Diário de Bordo");
  const [ob3Ticket, setOb3Ticket] = usePersistedState("ob3Ticket", 17);
  const [ob3Vendas, setOb3Vendas] = usePersistedState("ob3Vendas", 4);
  const [upsellNome, setUpsellNome] = usePersistedState("upsellNome", "");
  const [upsellTicket, setUpsellTicket] = usePersistedState("upsellTicket", 0);
  const [upsellVendas, setUpsellVendas] = usePersistedState("upsellVendas", 0);
  const [ppNome, setPpNome] = usePersistedState("ppNome", "");
  const [ppTicket, setPpTicket] = usePersistedState("ppTicket", 0);
  const [ppVendas, setPpVendas] = usePersistedState("ppVendas", 0);
  const [pp2Vendas, setPp2Vendas] = usePersistedState("pp2Vendas", 0);
  const [pp3Vendas, setPp3Vendas] = usePersistedState("pp3Vendas", 0);
  const [acessosPagina, setAcessosPagina] = usePersistedState("acessosPagina", 313);
  const [acessosCheckout, setAcessosCheckout] = usePersistedState("acessosCheckout", 67);
  const [ppAcessosPagina, setPpAcessosPagina] = usePersistedState("ppAcessosPagina", 0);
  const [ppAcessosCheckout, setPpAcessosCheckout] = usePersistedState("ppAcessosCheckout", 0);
  const [investimentoGasto, setInvestimentoGasto] = usePersistedState("investimentoGasto", 748);
  const [reembolsosLT, setReembolsosLT] = usePersistedState("reembolsosLT", 0);
  const [reembolsosOB, setReembolsosOB] = usePersistedState("reembolsosOB", 0);
  const [reembolsosPP, setReembolsosPP] = usePersistedState("reembolsosPP", 0);

  // Persist all state to localStorage
  useEffect(() => {
    const data: Record<string, any> = {
      orcamentoMensal, diasMes, diaAtual, verbaMeta, verbaGoogle, metaVendas,
      cpm, ctr, connectRate, txConvPaginaCompra,
      ltNome, ltTicket, ltVendas, lt2Nome, lt2Ticket, lt2Vendas,
      ob1Nome, ob1Ticket, ob1Vendas, ob2Nome, ob2Ticket, ob2Vendas, ob3Nome, ob3Ticket, ob3Vendas,
      upsellNome, upsellTicket, upsellVendas, ppNome, ppTicket, ppVendas, pp2Vendas, pp3Vendas,
      acessosPagina, acessosCheckout, ppAcessosPagina, ppAcessosCheckout,
      investimentoGasto, reembolsosLT, reembolsosOB, reembolsosPP,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  });

  const c = useMemo(() => {
    const orcSemanal = orcamentoMensal / 4;
    const orcDiario = orcamentoMensal / diasMes;
    const diasRestantes = Math.max(0, diasMes - diaAtual);
    const fatLT = ltVendas * ltTicket;
    const fatLT2 = lt2Vendas * lt2Ticket;
    const fatOB1 = ob1Vendas * ob1Ticket;
    const fatOB2 = ob2Vendas * ob2Ticket;
    const fatOB3 = ob3Vendas * ob3Ticket;
    const fatUpsell = upsellVendas * upsellTicket;
    const fatPP = ppVendas * ppTicket;
    const totalVendasLT = ltVendas + lt2Vendas;
    const totalLT = fatLT + fatLT2;
    const totalOB = fatOB1 + fatOB2 + fatOB3;
    const totalFunil = totalLT + totalOB + fatUpsell + fatPP;
    const convOB1 = totalVendasLT > 0 ? (ob1Vendas / totalVendasLT) * 100 : 0;
    const convOB2 = totalVendasLT > 0 ? (ob2Vendas / totalVendasLT) * 100 : 0;
    const convOB3 = totalVendasLT > 0 ? (ob3Vendas / totalVendasLT) * 100 : 0;
    const convLT = acessosPagina > 0 ? (ltVendas / acessosPagina) * 100 : 0;
    const roas = investimentoGasto > 0 ? totalFunil / investimentoGasto : 0;
    const ticketMedioLT = totalVendasLT > 0 ? totalLT / totalVendasLT : 0;
    const cac = totalVendasLT > 0 ? investimentoGasto / totalVendasLT : 0;
    const convPagCheckout = acessosPagina > 0 ? (acessosCheckout / acessosPagina) * 100 : 0;
    const convCheckoutCompra = acessosCheckout > 0 ? (ltVendas / acessosCheckout) * 100 : 0;
    const convPagCompra = acessosPagina > 0 ? (ltVendas / acessosPagina) * 100 : 0;
    const ppConvPagCheckout = ppAcessosPagina > 0 ? (ppAcessosCheckout / ppAcessosPagina) * 100 : 0;
    const ppConvCheckoutCompra = ppAcessosCheckout > 0 ? (ppVendas / ppAcessosCheckout) * 100 : 0;
    const ppConvPagCompra = ppAcessosPagina > 0 ? (ppVendas / ppAcessosPagina) * 100 : 0;
    const ppCac = ppVendas > 0 ? investimentoGasto / ppVendas : 0;
    const previsaoCPA = totalVendasLT > 0 ? investimentoGasto / totalVendasLT : 0;
    const previsaoVendas = diasMes > 0 && diaAtual > 0 ? (totalVendasLT / diaAtual) * diasMes : 0;
    const ticketMedioSim = totalVendasLT > 0 ? totalLT / totalVendasLT : 0;
    const fatSim = previsaoVendas * ticketMedioSim;
    const roasSim = orcamentoMensal > 0 ? fatSim / orcamentoMensal : 0;
    const fatTotalSim = fatSim;
    const liquidoSim = fatTotalSim - orcamentoMensal;
    const diasVendas = diaAtual;
    const vendasMediaDia = diasVendas > 0 ? totalVendasLT / diasVendas : 0;
    const faltouInvestir = orcamentoMensal - investimentoGasto;
    const percentMeta = metaVendas > 0 ? (totalVendasLT / metaVendas) * 100 : 0;
    const totalVendasAll = ltVendas + lt2Vendas + ob1Vendas + ob2Vendas + ob3Vendas + upsellVendas + ppVendas;
    const totalOBVendas = ob1Vendas + ob2Vendas + ob3Vendas;
    const taxaReembolsoLT = totalVendasLT > 0 ? (reembolsosLT / totalVendasLT) * 100 : 0;
    const taxaReembolsoOB = totalOBVendas > 0 ? (reembolsosOB / totalOBVendas) * 100 : 0;
    const taxaReembolsoPP = ppVendas > 0 ? (reembolsosPP / ppVendas) * 100 : 0;
    const impressoes = investimentoGasto > 0 && cpm > 0 ? (investimentoGasto / cpm) * 1000 : 0;
    const cliques = impressoes > 0 ? impressoes * (ctr / 100) : 0;
    const cpc = cliques > 0 ? investimentoGasto / cliques : 0;
    return {
      orcSemanal, orcDiario, diasRestantes,
      fatLT, fatLT2, fatOB1, fatOB2, fatOB3, fatUpsell, fatPP, totalLT, totalOB, totalFunil,
      convOB1, convOB2, convOB3, convLT, roas, ticketMedioLT, cac,
      convPagCheckout, convCheckoutCompra, convPagCompra,
      ppConvPagCheckout, ppConvCheckoutCompra, ppConvPagCompra, ppCac,
      previsaoCPA, previsaoVendas, ticketMedioSim, fatSim, roasSim, fatTotalSim, liquidoSim,
      diasVendas, vendasMediaDia, faltouInvestir, percentMeta,
      totalVendasAll, totalVendasLT,
      taxaReembolsoLT, taxaReembolsoOB, taxaReembolsoPP,
      impressoes, cliques, cpc,
    };
  }, [orcamentoMensal, diasMes, diaAtual, cpm, ctr, connectRate, txConvPaginaCompra, ltTicket, ltVendas, lt2Ticket, lt2Vendas, ob1Ticket, ob1Vendas, ob2Ticket, ob2Vendas, ob3Ticket, ob3Vendas, upsellTicket, upsellVendas, ppTicket, ppVendas, acessosPagina, acessosCheckout, ppAcessosPagina, ppAcessosCheckout, pp2Vendas, pp3Vendas, investimentoGasto, metaVendas, reembolsosLT, reembolsosOB, reembolsosPP]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Template LowTicket / Lançamento Pago</h2>
        <p className="text-[11px] text-muted-foreground">Campos com fundo escuro são editáveis. Os demais são calculados automaticamente. Dados salvos localmente.</p>
      </div>

      {/* TOP ROW: Resultados + Meta lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSection title="Resultados das Vendas">
          <div className="grid grid-cols-2 gap-3 p-4">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Investimento Total</p>
              <p className="text-xl font-bold">{fmtBRL(investimentoGasto)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Faturamento Total</p>
              <p className="text-xl font-bold">{fmtBRL(c.totalFunil)}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pb-4">
            <span className="text-xs text-muted-foreground">ROAS</span>
            <span className="text-2xl font-bold">{c.roas.toFixed(2)}</span>
            <StatusBadge value={c.roas} thresholds={{ bad: 1.0, ok: 1.2, good: 1.6 }} />
          </div>
        </CardSection>

        <CardSection title="Meta de Vendas do Mês">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Meta:</span>
              <EditCell value={metaVendas} onChange={setMetaVendas} className="w-20 text-center" />
            </div>
            <div className="text-3xl font-bold">{c.totalVendasLT} <span className="text-sm text-muted-foreground font-normal">/ {metaVendas.toLocaleString("pt-BR")}</span></div>
            <div className="w-full bg-muted rounded-full h-3 mt-3">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${Math.min(c.percentMeta, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{c.percentMeta.toFixed(0)}% da meta</p>
          </div>
        </CardSection>
      </div>

      {/* MAIN 3 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* COL 1 */}
        <div className="space-y-4">
          <CardSection title="Planejamento de Investimento">
            <Row label="Orçamento Mensal" editable editValue={orcamentoMensal} onChange={setOrcamentoMensal} value={fmtBRL(orcamentoMensal)} />
            <Row label="Orçamento Semanal" value={fmtBRL(c.orcSemanal)} />
            <Row label="Orçamento Diário" value={fmtBRL(c.orcDiario)} />
            <Row label="Verba Meta Ads" editable editValue={verbaMeta} onChange={setVerbaMeta} value={fmtBRL(verbaMeta)} />
            <Row label="Verba Google/YT" editable editValue={verbaGoogle} onChange={setVerbaGoogle} value={fmtBRL(verbaGoogle)} />
            <Row label="Dia Atual" editable editValue={diaAtual} onChange={setDiaAtual} value={diaAtual} />
            <Row label="Total de Dias do Mês" editable editValue={diasMes} onChange={setDiasMes} value={diasMes} />
            <Row label="Dias Restantes" value={c.diasRestantes} />
          </CardSection>

          <CardSection title="Simulação Mensal">
            <Row label="CPM" editable editValue={cpm} onChange={setCpm} step="0.01" value={fmtBRL(cpm)} />
            <Row label="CTR" editable editValue={ctr} onChange={setCtr} step="0.01" value={`${ctr}%`} />
            <Row label="Connect Rate" editable editValue={connectRate} onChange={setConnectRate} step="0.01" value={`${connectRate}%`} />
            <Row label="Tx. Conv. Página > Compra" editable editValue={txConvPaginaCompra} onChange={setTxConvPaginaCompra} step="0.01" value={`${txConvPaginaCompra}%`} />
            <Row label="Previsão de CPA" value={fmtBRL(c.previsaoCPA)} />
            <Row label="Previsão de Vendas" value={c.previsaoVendas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <Row label="Ticket Médio" value={fmtBRL(c.ticketMedioSim)} />
            <Row label="Faturamento" value={fmtBRL(c.fatSim)} />
            <Row label="ROAS" value={c.roasSim.toFixed(2)} />
            <Row label="Líquido" value={fmtBRL(c.liquidoSim)} className={c.liquidoSim < 0 ? "text-destructive" : ""} />
          </CardSection>
        </div>

        {/* COL 2 */}
        <div className="space-y-4">
          <CardSection title="Funil — Tráfego Pago">
            <div className="grid grid-cols-6 text-[10px] font-bold text-muted-foreground border-b border-border/30 bg-muted/20">
              <div className="px-2 py-1.5 col-span-1"></div>
              <div className="px-1 py-1.5 text-center">Nome</div>
              <div className="px-1 py-1.5 text-right">Ticket</div>
              <div className="px-1 py-1.5 text-right">Conv.</div>
              <div className="px-1 py-1.5 text-right">Vendas</div>
              <div className="px-1 py-1.5 text-right">Fat.</div>
            </div>
            {[
              { label: "LOW TICKET", nome: ltNome, setNome: setLtNome, ticket: ltTicket, setTicket: setLtTicket, vendas: ltVendas, setVendas: setLtVendas, conv: c.convLT, fat: c.fatLT },
              { label: "LOW TICKET 2", nome: lt2Nome, setNome: setLt2Nome, ticket: lt2Ticket, setTicket: setLt2Ticket, vendas: lt2Vendas, setVendas: setLt2Vendas, conv: 0, fat: c.fatLT2 },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
                <div className="px-2 py-0.5 font-medium text-[10px]">{row.label}</div>
                <div className="px-1"><EditCell value={row.nome} onChange={row.setNome} type="text" className="text-left text-[10px]" /></div>
                <div className="px-1"><EditCell value={row.ticket} onChange={row.setTicket} /></div>
                <ReadCell value={`${row.conv.toFixed(1)}%`} />
                <div className="px-1"><EditCell value={row.vendas} onChange={row.setVendas} /></div>
                <ReadCell value={fmtBRL(row.fat)} />
              </div>
            ))}
            {[
              { label: "ORDER BUMP 1", nome: ob1Nome, setNome: setOb1Nome, ticket: ob1Ticket, setTicket: setOb1Ticket, vendas: ob1Vendas, setVendas: setOb1Vendas, conv: c.convOB1, fat: c.fatOB1 },
              { label: "ORDER BUMP 2", nome: ob2Nome, setNome: setOb2Nome, ticket: ob2Ticket, setTicket: setOb2Ticket, vendas: ob2Vendas, setVendas: setOb2Vendas, conv: c.convOB2, fat: c.fatOB2 },
              { label: "ORDER BUMP 3", nome: ob3Nome, setNome: setOb3Nome, ticket: ob3Ticket, setTicket: setOb3Ticket, vendas: ob3Vendas, setVendas: setOb3Vendas, conv: c.convOB3, fat: c.fatOB3 },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
                <div className="px-2 py-0.5 font-medium text-[10px]">{row.label}</div>
                <div className="px-1"><EditCell value={row.nome} onChange={row.setNome} type="text" className="text-left text-[10px]" /></div>
                <div className="px-1"><EditCell value={row.ticket} onChange={row.setTicket} /></div>
                <ReadCell value={`${row.conv.toFixed(1)}%`} />
                <div className="px-1"><EditCell value={row.vendas} onChange={row.setVendas} /></div>
                <ReadCell value={fmtBRL(row.fat)} />
              </div>
            ))}
            {/* Upsell - editable */}
            <div className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
              <div className="px-2 py-0.5 font-medium text-[10px]">UPSELL</div>
              <div className="px-1"><EditCell value={upsellNome} onChange={setUpsellNome} type="text" className="text-left text-[10px]" /></div>
              <div className="px-1"><EditCell value={upsellTicket} onChange={setUpsellTicket} /></div>
              <ReadCell value="—" />
              <div className="px-1"><EditCell value={upsellVendas} onChange={setUpsellVendas} /></div>
              <ReadCell value={fmtBRL(c.fatUpsell)} />
            </div>
            {/* Produto Principal - editable */}
            <div className="grid grid-cols-6 text-[11px] border-b border-border/20 items-center">
              <div className="px-2 py-0.5 font-medium text-[10px]">PRINCIPAL</div>
              <div className="px-1"><EditCell value={ppNome} onChange={setPpNome} type="text" className="text-left text-[10px]" /></div>
              <div className="px-1"><EditCell value={ppTicket} onChange={setPpTicket} /></div>
              <ReadCell value="—" />
              <div className="px-1"><EditCell value={ppVendas} onChange={setPpVendas} /></div>
              <ReadCell value={fmtBRL(c.fatPP)} />
            </div>
            {/* Total */}
            <div className="grid grid-cols-6 text-[11px] items-center bg-accent/30">
              <div className="px-2 py-1.5 font-bold text-[10px] col-span-4">TOTAL FUNIL</div>
              <ReadCell value={String(c.totalVendasAll)} className="font-bold" />
              <ReadCell value={fmtBRL(c.totalFunil)} className="font-bold" />
            </div>
          </CardSection>

          <div className="grid grid-cols-2 gap-4">
            <CardSection title="Low Ticket">
              <Row label="Ticket Médio" value={fmtBRL(c.ticketMedioLT)} />
              <Row label="Acessos Página" editable editValue={acessosPagina} onChange={setAcessosPagina} value={acessosPagina} />
              <Row label="Acessos Checkout" editable editValue={acessosCheckout} onChange={setAcessosCheckout} value={acessosCheckout} />
              <Row label="CAC" value={fmtBRL(c.cac)} highlight />
              <Row label="Tx. Conv." value={`${c.convPagCompra.toFixed(1)}%`} />
            </CardSection>
            <CardSection title="Produto Principal">
              <Row label="Ticket Médio" value={ppTicket > 0 ? fmtBRL(ppTicket) : "—"} />
              <Row label="Acessos Página" editable editValue={ppAcessosPagina} onChange={setPpAcessosPagina} value={ppAcessosPagina} />
              <Row label="Acessos Checkout" editable editValue={ppAcessosCheckout} onChange={setPpAcessosCheckout} value={ppAcessosCheckout} />
              <Row label="CAC" value={ppVendas > 0 ? fmtBRL(c.ppCac) : "—"} highlight />
              <Row label="Tx. Conv." value={ppAcessosPagina > 0 ? `${c.ppConvPagCompra.toFixed(1)}%` : "—"} />
            </CardSection>
          </div>
        </div>

        {/* COL 3 */}
        <div className="space-y-4">
          <CardSection title="Resultados Gerais">
            <Row label="Faturamento" value={fmtBRL(c.totalFunil)} highlight />
            <Row label="Investimento" editable editValue={investimentoGasto} onChange={setInvestimentoGasto} value={fmtBRL(investimentoGasto)} />
            <Row label="ROAS" value={c.roas.toFixed(2)} />
            <Row label="Dias de Vendas" value={c.diasVendas} />
            <Row label="Vendas/Dia" value={c.vendasMediaDia.toFixed(1)} />
            <Row label="Faltou Investir" value={fmtBRL(c.faltouInvestir)} />
          </CardSection>

          <CardSection title="Reembolsos">
            <div className="border-b border-border/20 px-3 py-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">LT</span>
              <div className="flex items-center gap-2">
                <div className="w-14"><EditCell value={reembolsosLT} onChange={setReembolsosLT} /></div>
                <span className="text-xs w-14 text-right">{c.taxaReembolsoLT.toFixed(1)}%</span>
              </div>
            </div>
            <div className="border-b border-border/20 px-3 py-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Order Bumps</span>
              <div className="flex items-center gap-2">
                <div className="w-14"><EditCell value={reembolsosOB} onChange={setReembolsosOB} /></div>
                <span className="text-xs w-14 text-right">{c.taxaReembolsoOB.toFixed(1)}%</span>
              </div>
            </div>
            <div className="px-3 py-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">Produto Principal</span>
              <div className="flex items-center gap-2">
                <div className="w-14"><EditCell value={reembolsosPP} onChange={setReembolsosPP} /></div>
                <span className="text-xs w-14 text-right">{c.taxaReembolsoPP.toFixed(1)}%</span>
              </div>
            </div>
          </CardSection>

          <CardSection title="Tráfego">
            <div className="grid grid-cols-3 text-[10px] font-bold text-muted-foreground border-b border-border/30 bg-muted/20 px-3 py-1.5">
              <div></div><div className="text-right">%</div><div className="text-right">Vendas</div>
            </div>
            <div className="grid grid-cols-3 text-[11px] border-b border-border/20 px-3 py-1.5">
              <div>Tráfego Pago</div>
              <div className="text-right">100%</div>
              <div className="text-right font-bold">{c.totalVendasAll}</div>
            </div>
            <div className="grid grid-cols-3 text-[11px] px-3 py-1.5">
              <div>Orgânico</div>
              <div className="text-right">0%</div>
              <div className="text-right">0</div>
            </div>
          </CardSection>
        </div>
      </div>

      {/* Calculadora CPM */}
      <CardSection title="Calculadora de CPM">
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Impressões", value: c.impressoes.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) },
              { label: "Cliques", value: c.cliques.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) },
              { label: "CPC", value: fmtBRL(c.cpc) },
              { label: "CPM", value: fmtBRL(cpm), badge: <StatusBadge value={cpm} thresholds={{ bad: 50, ok: 35, good: 25, invert: true }} /> },
              { label: "CTR", value: `${ctr.toFixed(2)}%`, badge: <StatusBadge value={ctr} thresholds={{ bad: 1.0, ok: 1.4, good: 2.0 }} /> },
            ].map((item, i) => (
              <div key={i} className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1">{item.label} {item.badge}</p>
                <p className="text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardSection>

      {/* Referência */}
      <CardSection title="Referência de Métricas (Funil LowTicket)">
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
      </CardSection>
    </div>
  );
}
