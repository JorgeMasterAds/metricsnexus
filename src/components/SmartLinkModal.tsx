import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/ui/number-stepper";
import { X, Plus, Trash2 } from "lucide-react";

interface Variant {
  id?: string;
  name: string;
  url: string;
  weight: number;
  is_active: boolean;
}

interface Props {
  link?: any;
  accountId?: string;
  projectId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SmartLinkModal({ link, accountId, projectId, onClose, onSaved }: Props) {
  const isEditing = !!link;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState(link?.name || "");
  const [slug, setSlug] = useState(link?.slug || "");
  const [variants, setVariants] = useState<Variant[]>(
    link?.smartlink_variants?.length > 0
      ? link.smartlink_variants.map((v: any) => ({ id: v.id, name: v.name, url: v.url, weight: v.weight, is_active: v.is_active }))
      : [
          { name: "Variante A", url: "", weight: 50, is_active: true },
          { name: "Variante B", url: "", weight: 50, is_active: true },
        ]
  );
  const [loading, setLoading] = useState(false);

  const totalWeight = variants.reduce((s, v) => s + v.weight, 0);

  const addVariant = () => {
    setVariants([...variants, { name: `Variante ${String.fromCharCode(65 + variants.length)}`, url: "", weight: 0, is_active: true }]);
  };

  const removeVariant = (i: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, idx) => idx !== i));
  };

  const updateVariant = (i: number, field: keyof Variant, value: any) => {
    setVariants(variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  };

  const equalizeWeights = () => {
    const w = Math.floor(100 / variants.length);
    const remainder = 100 - w * variants.length;
    setVariants(variants.map((v, i) => ({ ...v, weight: w + (i === 0 ? remainder : 0) })));
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: "Preencha nome e slug", variant: "destructive" });
      return;
    }
    if (totalWeight !== 100) {
      toast({ title: `Pesos devem somar 100% (atual: ${totalWeight}%)`, variant: "destructive" });
      return;
    }
    if (variants.some(v => !v.url.trim())) {
      toast({ title: "Todas as variantes precisam de uma URL", variant: "destructive" });
      return;
    }
    const urls = variants.map(v => v.url.trim().toLowerCase());
    const uniqueUrls = new Set(urls);
    if (uniqueUrls.size !== urls.length) {
      toast({ title: "As variantes não podem ter URLs iguais", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Não autenticado");

      if (isEditing) {
        const { error } = await (supabase as any).from("smartlinks").update({ name, slug }).eq("id", link.id);
        if (error) throw error;

        await (supabase as any).from("smartlink_variants").delete().eq("smartlink_id", link.id);
        const { error: ve } = await (supabase as any).from("smartlink_variants").insert(
          variants.map(v => ({ smartlink_id: link.id, account_id: accountId, name: v.name, url: v.url, weight: v.weight, is_active: v.is_active }))
        );
        if (ve) throw ve;
      } else {
        const { data: sl, error: sle } = await (supabase as any)
          .from("smartlinks")
          .insert({ name, slug: slug.toLowerCase().replace(/\s+/g, "-"), account_id: accountId, project_id: projectId || null, created_by: userId })
          .select()
          .single();
        if (sle) throw sle;

        const { error: ve } = await (supabase as any).from("smartlink_variants").insert(
          variants.map(v => ({ smartlink_id: sl.id, account_id: accountId, name: v.name, url: v.url, weight: v.weight, is_active: v.is_active }))
        );
        if (ve) throw ve;
      }

      toast({ title: isEditing ? "Smart Link atualizado!" : "Smart Link criado!" });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border/50 rounded-xl card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-semibold">{isEditing ? "Editar Smart Link" : "Novo Smart Link"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Smart Link</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: VSL Principal" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                  placeholder="vsl-principal"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Variantes</Label>
              <div className="flex gap-2">
                <button onClick={equalizeWeights} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Equalizar pesos
                </button>
                <span className={`text-xs font-mono ${totalWeight === 100 ? "text-success" : "text-destructive"}`}>
                  Total: {totalWeight}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Input
                      value={v.name}
                      onChange={(e) => updateVariant(i, "name", e.target.value)}
                      placeholder="Nome da variante"
                      className="font-medium h-8 text-sm w-40"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs">Peso:</Label>
                        <NumberStepper
                          value={v.weight}
                          onChange={(val) => updateVariant(i, "weight", val)}
                          min={0}
                          max={100}
                          suffix="%"
                        />
                      </div>
                      <button
                        onClick={() => updateVariant(i, "is_active", !v.is_active)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${v.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        {v.is_active ? "Ativa" : "Inativa"}
                      </button>
                      {variants.length > 1 && (
                        <button onClick={() => removeVariant(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Input
                    value={v.url}
                    onChange={(e) => updateVariant(i, "url", e.target.value)}
                    placeholder="https://sua-pagina.com/venda"
                    className="text-xs"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addVariant}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-lg py-2.5 transition-colors hover:border-border"
            >
              <Plus className="h-4 w-4" />
              Adicionar variante
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={loading || totalWeight !== 100}
            className="gradient-bg border-0 text-primary-foreground hover:opacity-90"
          >
            {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Smart Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
