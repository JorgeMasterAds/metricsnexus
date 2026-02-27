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
import { Globe, Copy, Check, RefreshCw, Code, AlertTriangle, CheckCircle2 } from "lucide-react";

const SUPABASE_PROJECT_ID = "fnpmuffrqrlofjvqytof";
const REDIRECT_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/redirect`;

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

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Código copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <pre className="bg-muted/40 border border-border/30 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">{code}</pre>
      <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border/50 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function Resources() {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  return (
    <DashboardLayout title="Recursos" subtitle="Gerencie domínios e recursos da plataforma">
      <DomainsSection accountId={activeAccountId} projectId={activeProjectId} />
    </DashboardLayout>
  );
}

function generateWorkerScript(accountId: string) {
  return `// Cloudflare Worker — Nexus Metrics Smart Link Redirect
// Cole este código no seu Cloudflare Worker
// Rota: seudominio.com/* (catch-all)

const REDIRECT_ENDPOINT = "${REDIRECT_BASE}";
const ACCOUNT_ID = "${accountId}";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\\/+/, "").split("/")[0];

    if (!slug || slug === "favicon.ico" || slug === "robots.txt") {
      return new Response("Not found", { status: 404 });
    }

    // Monta a URL da Edge Function com UTMs preservados
    const params = new URLSearchParams(url.search);
    params.set("slug", slug);
    params.set("account_id", ACCOUNT_ID);
    params.set("domain", url.hostname);

    const redirectUrl = REDIRECT_ENDPOINT + "?" + params.toString();

    // Chama a Edge Function e retorna o redirect
    const response = await fetch(redirectUrl, {
      method: "GET",
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "",
        "X-Forwarded-For": request.headers.get("CF-Connecting-IP") || "",
        "X-Real-IP": request.headers.get("CF-Connecting-IP") || "",
        "CF-IPCountry": request.headers.get("CF-IPCountry") || "",
        "Referer": request.headers.get("Referer") || "",
      },
      redirect: "manual",
    });

    // Retorna o 302 da Edge Function direto ao cliente
    if (response.status === 302 || response.status === 301) {
      return new Response(null, {
        status: response.status,
        headers: {
          "Location": response.headers.get("Location") || "",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Se não encontrou o link, retorna o erro
    const body = await response.text();
    return new Response(body, { status: response.status });
  },
};`;
}

function DomainsSection({ accountId, projectId }: { accountId?: string; projectId?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showWorkerCode, setShowWorkerCode] = useState(false);

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

  const workerCode = accountId ? generateWorkerScript(accountId) : "";

  return (
    <div className="space-y-6">
      {/* Adicionar domínio */}
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

      {/* Configuração com Cloudflare Workers */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          Como configurar seu domínio (Cloudflare Workers)
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          A maneira mais simples e confiável de usar seu domínio personalizado. <strong>Gratuito</strong>, sem problemas de SSL, funciona com qualquer subdomínio.
        </p>

        {/* Aviso sobre CNAME */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 mb-5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Importante:</strong> Apontar CNAME diretamente para o Supabase <strong>não funciona</strong> por limitações de certificado SSL. Use o método abaixo (Cloudflare Workers) — é a solução definitiva.
          </p>
        </div>

        {/* Passo a passo */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            <div>
              <p className="text-sm font-medium">Acesse o painel do Cloudflare</p>
              <p className="text-xs text-muted-foreground">
                Vá em <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dash.cloudflare.com</a> e selecione seu domínio. Se não usa Cloudflare, cadastre seu domínio gratuitamente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
            <div>
              <p className="text-sm font-medium">Crie um Worker</p>
              <p className="text-xs text-muted-foreground">
                No menu lateral, clique em <strong>Workers & Pages → Criar</strong>. Dê um nome como "nexus-redirect" e clique em "Deploy". Depois clique em "Editar código".
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
            <div className="w-full">
              <p className="text-sm font-medium mb-2">Cole o código abaixo no Worker</p>
              <Button variant="outline" size="sm" className="text-xs mb-3" onClick={() => setShowWorkerCode(!showWorkerCode)}>
                <Code className="h-3.5 w-3.5 mr-1" />
                {showWorkerCode ? "Ocultar código" : "Mostrar código do Worker"}
              </Button>
              {showWorkerCode && <CopyBlock code={workerCode} />}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
            <div>
              <p className="text-sm font-medium">Configure a rota do Worker</p>
              <p className="text-xs text-muted-foreground">
                Vá na aba <strong>"Triggers" → "Custom Domains"</strong> e adicione seu subdomínio (ex: <code className="bg-muted px-1 py-0.5 rounded text-primary">links.seudominio.com.br</code>). O Cloudflare configura DNS e SSL automaticamente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-success/20 text-success text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-medium">Pronto!</p>
              <p className="text-xs text-muted-foreground">
                Seus links personalizados já estarão funcionando em segundos. Exemplo: <code className="bg-muted px-1 py-0.5 rounded text-primary">https://links.seudominio.com.br/meu-slug</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Teste de link */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
        <h2 className="text-sm font-semibold mb-3">Link direto (sem domínio personalizado)</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Seus Smart Links também funcionam diretamente pela URL abaixo, sem precisar de domínio personalizado:
        </p>
        <div className="bg-muted/30 rounded-lg p-3">
          <CopyableValue value={`${REDIRECT_BASE}?slug=SEU_SLUG&account_id=${accountId || "SEU_ACCOUNT_ID"}`} />
        </div>
      </div>
    </div>
  );
}