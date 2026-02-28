import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

const PLATFORM_SMARTLINK_DOMAIN = "smartlink.jmads.com.br";

export default function Resources() {
  return (
    <DashboardLayout title="Recursos" subtitle="Gerencie domínios e recursos da plataforma">
      <div className="space-y-6">
        <CustomDomainSection />
      </div>
    </DashboardLayout>
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
