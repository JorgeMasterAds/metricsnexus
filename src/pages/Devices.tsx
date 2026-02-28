import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAIAgents } from "@/hooks/useAIAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Smartphone, Trash2, Wifi, WifiOff, RefreshCw, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ApiMode = null | "official" | "coexistence";

export default function Devices() {
  const { devices, addDevice, deleteDevice, isLoading } = useAIAgents();
  const [showAdd, setShowAdd] = useState(false);
  const [apiMode, setApiMode] = useState<ApiMode>(null);
  const [instanceName, setInstanceName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleAdd = () => {
    if (!instanceName.trim() || !apiUrl.trim() || !apiKey.trim()) return;
    addDevice.mutate({ instanceName: instanceName.trim(), apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
    setInstanceName("");
    setApiUrl("");
    setApiKey("");
    setShowAdd(false);
    setApiMode(null);
  };

  const openConnect = () => {
    setApiMode(null);
    setShowAdd(true);
  };

  return (
    <DashboardLayout
      title="Dispositivos"
      subtitle="Conecte seu WhatsApp via API Oficial da Meta"
      actions={
        <Button size="sm" onClick={openConnect} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Dispositivo
        </Button>
      }
    >
      {/* WhatsApp info */}
      <div className="rounded-xl bg-muted/30 border border-border p-4 mb-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5">
            <p className="font-medium text-foreground">API Oficial do WhatsApp (Meta Cloud API)</p>
            <p className="text-muted-foreground">
              O Nexus Metrics suporta a integração com a <strong>API Oficial do WhatsApp via Meta Cloud API</strong>.
              Você pode escolher entre o modo <strong>Oficial</strong> (API exclusiva) ou <strong>Coexistência</strong> (API + app pessoal simultaneamente).
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Smartphone className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <h3 className="text-lg font-medium">Nenhum dispositivo conectado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Conecte seu WhatsApp através da API Oficial da Meta para enviar e receber mensagens automaticamente.
          </p>
          <Button onClick={openConnect} className="gap-1.5">
            <Plus className="h-4 w-4" /> Conectar WhatsApp
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map((device: any) => (
            <div key={device.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${device.status === "connected" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{device.instance_name}</h3>
                    <p className="text-xs text-muted-foreground">{device.api_url}</p>
                  </div>
                </div>
                <Badge variant={device.status === "connected" ? "default" : "secondary"} className="text-[10px] gap-1">
                  {device.status === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {device.status === "connected" ? "Online" : "Offline"}
                </Badge>
              </div>
              {device.phone_number && <p className="text-xs text-muted-foreground">📱 {device.phone_number}</p>}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                  <RefreshCw className="h-3 w-3" /> Reconectar
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 text-destructive" onClick={() => deleteDevice.mutate(device.id)}>
                  <Trash2 className="h-3 w-3" /> Remover
                </Button>
              </div>
              {device.last_seen_at && (
                <p className="text-[10px] text-muted-foreground">
                  Última atividade: {new Date(device.last_seen_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setApiMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>

          {!apiMode ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Escolha o modo de conexão com a API Oficial da Meta:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setApiMode("official")}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 bg-card transition-colors text-left space-y-2"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">API Oficial</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Modo exclusivo para a API. O número de WhatsApp será dedicado apenas para automações e integrações, sem uso simultâneo no aplicativo pessoal.
                  </p>
                </button>
                <button
                  onClick={() => setApiMode("coexistence")}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 bg-card transition-colors text-left space-y-2"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">API Oficial + Coexistência</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    A API opera simultaneamente com o aplicativo WhatsApp no celular. Você pode usar o app normalmente enquanto automações funcionam em paralelo.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">
                  Modo: {apiMode === "official" ? "API Oficial" : "API Oficial + Coexistência"}
                </p>
                <p>Configure os dados de conexão da Meta Cloud API abaixo. Esta funcionalidade estará disponível em breve.</p>
              </div>
              <div>
                <Label>Nome da Instância</Label>
                <Input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="Ex: whatsapp-vendas" />
              </div>
              <div>
                <Label>URL da API</Label>
                <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://graph.facebook.com/v18.0" />
              </div>
              <div>
                <Label>Token de Acesso</Label>
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Token permanente da Meta" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setApiMode(null)} className="flex-1">Voltar</Button>
                <Button onClick={handleAdd} className="flex-1 gap-1.5" disabled={addDevice.isPending}>
                  <Plus className="h-4 w-4" /> Conectar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
