import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useState } from "react";
import { Globe, Copy, Check, RefreshCw, Link2, Webhook, CheckCircle2 } from "lucide-react";

const PLATFORM_SMARTLINK_DOMAIN = "smartlink.jmads.com.br";
const PLATFORM_WEBHOOK_DOMAIN = "webhook.nexusmetrics.jmads.com.br";

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
      <button onClick={handleCopy} className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Copiar">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

export default function Resources() {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  return (
    <DashboardLayout title="Recursos" subtitle="Gerencie domínios e recursos da plataforma">
      <div className="space-y-6">
        <PlatformDomainsSection />
        <DomainsSection accountId={activeAccountId} projectId={activeProjectId} />
      </div>
    </DashboardLayout>
  );
}

function PlatformDomainsSection() {
  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
      <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success" />
        Domínios da Plataforma
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        Todos os seus Smart Links e Webhooks já utilizam domínios personalizados da plataforma. Não é necessária nenhuma configuração adicional.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/30 bg-secondary/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Smart Links</span>
            <Badge variant="outline" className="text-[10px] text-success border-success/30">Ativo</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Seus links ficam no formato:</p>
          <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-primary block break-all">
            https://{PLATFORM_SMARTLINK_DOMAIN}/seu-slug
          </code>
        </div>

        <div className="rounded-lg border border-border/30 bg-secondary/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Webhook className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Webhooks</span>
            <Badge variant="outline" className="text-[10px] text-success border-success/30">Ativo</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Suas URLs de webhook ficam no formato:</p>
          <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-primary block break-all">
            https://{PLATFORM_WEBHOOK_DOMAIN}/seu-token
          </code>
        </div>
      </div>
    </div>
  );
}

function DomainsSection({ accountId, projectId }: { accountId?: string; projectId?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const SUPABASE_PROJECT_ID = "fnpmuffrqrlofjvqytof";

  const { data: domains = [] } = useQuery({
    queryKey: ["custom-domains", accountId, projectId],
    queryFn: async () => {
      let query = (supabase as any).from("custom_domains").select("*").eq("account_id", accountId);
      if (projectId) query = query.eq("project_id", projectId);
      const { data } = await query.order("created_at");
      return data || [];
    },
    enabled: !!accountId,
  });

  const addDomain = async () => {
    if (!domain.trim() || !accountId) return;
    setAdding(true);
    try {
      const { error } = await (supabase as any).from("custom_domains").insert({ account_id: accountId, project_id: projectId || null, domain: domain.trim().toLowerCase() });
      if (error) throw error;
      toast({ title: "Domínio adicionado!" });
      setDomain("");
      await qc.refetchQueries({ queryKey: ["custom-domains", accountId, projectId] });
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
      const res = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/verify-dns`,
        { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, body: JSON.stringify({ domain_id: domainId }) }
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
    } finally { setVerifyingId(null); }
  };

  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        Domínio Personalizado (opcional)
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Se preferir, você pode configurar seu próprio domínio para Smart Links. Caso contrário, o domínio padrão da plataforma (<code className="bg-muted px-1 py-0.5 rounded text-primary">{PLATFORM_SMARTLINK_DOMAIN}</code>) será utilizado automaticamente.
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
            <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-secondary/50 border border-border/30">
              <div className="min-w-0">
                <p className="text-sm font-medium font-mono break-all">{d.domain}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] ${d.is_verified ? "text-success border-success/30" : "text-warning border-warning/30"}`}>
                    {d.is_verified ? "Verificado" : "Pendente"}
                  </Badge>
                  {d.is_active && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Ativo</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!d.is_verified && (
                  <Button variant="outline" size="sm" className="text-xs" disabled={verifyingId === d.id} onClick={() => verifyDns(d.id)}>
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
  );
}
