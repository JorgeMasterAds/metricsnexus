import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/useAccount";
import { useState } from "react";
import { Globe, Copy, Check, RefreshCw } from "lucide-react";

const CNAME_TARGET = "fnpmuffrqrlofjvqytof.supabase.co";

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-primary break-all select-all">{value}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        title="Copiar valor"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

export default function Resources() {
  const { activeAccountId } = useAccount();

  return (
    <DashboardLayout title="Recursos" subtitle="Gerencie domínios e recursos da plataforma">
      <DomainsSection accountId={activeAccountId} />
    </DashboardLayout>
  );
}

function DomainsSection({ accountId }: { accountId?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: domains = [] } = useQuery({
    queryKey: ["custom-domains", accountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("custom_domains").select("*").eq("account_id", accountId).order("created_at");
      return data || [];
    },
    enabled: !!accountId,
  });

  const addDomain = async () => {
    if (!domain.trim() || !accountId) return;
    setAdding(true);
    try {
      const { error } = await (supabase as any).from("custom_domains").insert({ account_id: accountId, domain: domain.trim().toLowerCase() });
      if (error) throw error;
      toast({ title: "Domínio adicionado!" });
      setDomain("");
      qc.invalidateQueries({ queryKey: ["custom-domains"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const removeDomain = async (id: string) => {
    if (!confirm("Remover este domínio?")) return;
    await (supabase as any).from("custom_domains").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["custom-domains"] });
    toast({ title: "Domínio removido" });
  };

  const verifyDns = async (domainId: string) => {
    setVerifyingId(domainId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/verify-dns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ domain_id: domainId }),
        }
      );
      const result = await res.json();

      if (result.verified) {
        toast({ title: "✅ DNS Verificado!", description: result.message });
        qc.invalidateQueries({ queryKey: ["custom-domains"] });
      } else {
        toast({ title: "DNS não verificado", description: result.message || result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Domínio Personalizado</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Configure seu próprio domínio para os Smart Links. Seus links ficarão no formato: <code className="bg-muted px-1.5 py-0.5 rounded text-primary">https://seudominio.com/slug</code>
        </p>

        <div className="flex gap-3 mb-6">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Ex: links.meusite.com.br" className="flex-1" />
          <Button onClick={addDomain} disabled={adding || !domain.trim()} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
            {adding ? "Adicionando..." : "Adicionar domínio"}
          </Button>
        </div>

        {domains.length > 0 && (
          <div className="space-y-3">
            {domains.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/30">
                <div>
                  <p className="text-sm font-medium font-mono">{d.domain}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${d.is_verified ? "text-success border-success/30" : "text-warning border-warning/30"}`}>
                      {d.is_verified ? "Verificado" : "Pendente"}
                    </Badge>
                    {d.is_active && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Ativo</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!d.is_verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={verifyingId === d.id}
                      onClick={() => verifyDns(d.id)}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${verifyingId === d.id ? "animate-spin" : ""}`} />
                      {verifyingId === d.id ? "Verificando..." : "Verificar DNS"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => removeDomain(d.id)}>Remover</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
        <h2 className="text-sm font-semibold mb-4">Instruções de configuração DNS</h2>
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>Para usar um domínio personalizado, configure os seguintes registros DNS no seu provedor:</p>
         <div className="bg-muted/30 rounded-lg p-4 space-y-2 font-mono text-xs">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-foreground font-semibold">Tipo</span>
              <span className="text-foreground font-semibold">Nome</span>
              <span className="text-foreground font-semibold">Valor</span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span>CNAME</span>
              <span>links (ou seu subdomínio)</span>
              <CopyableValue value={CNAME_TARGET} />
            </div>
          </div>
          <p className="mt-2"><strong>Exemplo:</strong> Se seu domínio é <code className="bg-muted px-1.5 py-0.5 rounded text-primary">meusite.com.br</code>, crie um registro CNAME chamado <code className="bg-muted px-1.5 py-0.5 rounded text-primary">links</code> apontando para <CopyableValue value={CNAME_TARGET} />.</p>
          <p>Após configurar o DNS, aguarde a propagação (até 72 horas) e clique em "Verificar DNS" para ativar.</p>
        </div>
      </div>
    </div>
  );
}