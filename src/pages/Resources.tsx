import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Link2, Webhook, Lock } from "lucide-react";

const PLATFORM_SMARTLINK_DOMAIN = "smartlink.jmads.com.br";
const PLATFORM_WEBHOOK_DOMAIN = "webhook.nexusmetrics.jmads.com.br";

export default function Resources() {
  return (
    <DashboardLayout title="Recursos" subtitle="Gerencie domínios e recursos da plataforma">
      <div className="space-y-6">
        <PlatformDomainsSection />
        <CustomDomainSection />
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

function CustomDomainSection() {
  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 opacity-60">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Domínio Personalizado para Smart Links
        </h2>
        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">Em breve</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Futuramente você poderá configurar seu próprio domínio para Smart Links. Caso não configure, o domínio padrão da plataforma (<code className="bg-muted px-1 py-0.5 rounded text-primary">{PLATFORM_SMARTLINK_DOMAIN}</code>) será utilizado automaticamente.
      </p>
    </div>
  );
}
