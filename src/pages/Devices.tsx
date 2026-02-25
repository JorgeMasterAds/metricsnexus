import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAIAgents } from "@/hooks/useAIAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Smartphone, Trash2, Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

export default function Devices() {
  const { devices, addDevice, deleteDevice, isLoading } = useAIAgents();
  const [showAdd, setShowAdd] = useState(false);
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
  };

  return (
    <DashboardLayout
      title="Dispositivos"
      subtitle="Conecte seu WhatsApp via Evolution API"
      actions={
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Dispositivo
        </Button>
      }
    >
      {/* Warning banner */}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-amber-400">Atenção — Boas práticas para evitar bloqueio</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
              <li>Não envie mensagens em massa ou spam</li>
              <li>Evite mensagens repetitivas para o mesmo contato</li>
              <li>Respeite limites de envio (máx ~200 msg/dia para contas novas)</li>
              <li>Use um número exclusivo para automação, nunca seu número pessoal</li>
              <li>Aguarde pelo menos 5 segundos entre envios consecutivos</li>
            </ul>
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
            Conecte seu WhatsApp através da Evolution API para enviar e receber mensagens automaticamente.
          </p>
          <Button onClick={() => setShowAdd(true)} className="gap-1.5">
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
                <div className="flex items-center gap-2">
                  <Badge variant={device.status === "connected" ? "default" : "secondary"} className="text-[10px] gap-1">
                    {device.status === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {device.status === "connected" ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>
              
              {device.phone_number && (
                <p className="text-xs text-muted-foreground">📱 {device.phone_number}</p>
              )}
              
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Como funciona:</p>
              <p>1. Instale a <strong>Evolution API</strong> em seu servidor</p>
              <p>2. Crie uma instância no painel da Evolution API</p>
              <p>3. Copie a URL da API e a chave de autenticação abaixo</p>
              <p>4. Escaneie o QR Code no painel da Evolution API para conectar</p>
            </div>

            <div>
              <Label>Nome da Instância</Label>
              <Input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="Ex: whatsapp-vendas" />
            </div>
            <div>
              <Label>URL da Evolution API</Label>
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://sua-evolution-api.com" />
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Chave de autenticação" />
            </div>

            <Button onClick={handleAdd} className="w-full gap-1.5" disabled={addDevice.isPending}>
              <Plus className="h-4 w-4" /> Conectar Dispositivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
