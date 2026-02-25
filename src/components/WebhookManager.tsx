import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Trash2, Link2, Pencil, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PLATFORMS = [
  { value: "hotmart", label: "Hotmart" },
  { value: "kiwify", label: "Kiwify" },
  { value: "eduzz", label: "Eduzz" },
  { value: "monetizze", label: "Monetizze" },
  { value: "other", label: "Outra" },
];

export default function WebhookManager() {
  const { activeAccountId } = useAccount();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("hotmart");
  const [platformName, setPlatformName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", activeAccountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("webhooks")
        .select("*, webhook_products(product_id, products:product_id(id, name, external_id))")
        .eq("account_id", activeAccountId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const canSave = name.trim() && (platform !== "other" || platformName.trim());

  const createWebhook = async () => {
    if (!canSave || !activeAccountId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("webhooks").insert({
        account_id: activeAccountId,
        name: name.trim(),
        platform,
        platform_name: platform === "other" ? platformName.trim() : null,
      });
      if (error) throw error;
      toast({ title: "Webhook criado!" });
      setName("");
      setPlatform("hotmart");
      setPlatformName("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    await (supabase as any).from("webhooks").update({ is_active: !isActive }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["webhooks"] });
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("Excluir este webhook? Essa ação é irreversível.")) return;
    await (supabase as any).from("webhooks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["webhooks"] });
    toast({ title: "Webhook excluído" });
  };

  const renameWebhook = async (id: string) => {
    if (!editingName.trim()) return;
    await (supabase as any).from("webhooks").update({ name: editingName.trim() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["webhooks"] });
    setEditingId(null);
    toast({ title: "Nome atualizado!" });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const getWebhookUrl = (token: string) =>
    `https://${supabaseProjectId}.supabase.co/functions/v1/webhook/${token}`;

  const getPlatformLabel = (wh: any) => {
    if (wh.platform === "other" && wh.platform_name) return wh.platform_name;
    return PLATFORMS.find(p => p.value === wh.platform)?.label || wh.platform;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Webhooks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie webhooks exclusivos para cada integração. Cada webhook possui uma URL única.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Criar Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Hotmart - Produto X"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Plataforma</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        platform === p.value
                          ? "gradient-bg text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {platform === "other" && (
                <div className="space-y-1.5">
                  <Label>Nome da plataforma *</Label>
                  <Input
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="Digite o nome da plataforma"
                    required
                  />
                </div>
              )}
              <Button
                onClick={createWebhook}
                disabled={saving || !canSave}
                className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90"
              >
                {saving ? "Criando..." : "Criar Webhook"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
          <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum webhook criado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie um webhook para começar a receber vendas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: any) => (
            <div key={wh.id} className="rounded-xl bg-card border border-border/50 card-shadow p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {editingId === wh.id ? (
                      <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-7 text-sm w-48"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameWebhook(wh.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button onClick={() => renameWebhook(wh.id)} className="p-1 rounded hover:bg-accent text-success"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    ) : (
                      <h3 className="text-sm font-semibold truncate flex items-center gap-1.5">
                        {wh.name}
                        <button
                          onClick={() => { setEditingId(wh.id); setEditingName(wh.name); }}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-accent transition-colors"
                          title="Renomear"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </h3>
                    )}
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {getPlatformLabel(wh)}
                    </Badge>
                    <Badge
                      variant={wh.is_active ? "default" : "secondary"}
                      className={`text-[10px] ${wh.is_active ? "bg-success/20 text-success border-success/30" : ""}`}
                    >
                      {wh.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      readOnly
                      value={getWebhookUrl(wh.token)}
                      className="font-mono text-[11px] h-8 bg-muted/30"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => copy(getWebhookUrl(wh.token))}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {wh.webhook_products && wh.webhook_products.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] text-muted-foreground mr-1">Produtos:</span>
                      {wh.webhook_products.map((wp: any) => (
                        <Badge key={wp.product_id} variant="outline" className="text-[10px]">
                          {wp.products?.name || wp.product_id}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Criado em {new Date(wh.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={wh.is_active}
                    onCheckedChange={() => toggleWebhook(wh.id, wh.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteWebhook(wh.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
