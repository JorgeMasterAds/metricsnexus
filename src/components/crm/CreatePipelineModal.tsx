import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCRM } from "@/hooks/useCRM";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreatePipelineModal({ open, onOpenChange }: Props) {
  const { createPipeline, products } = useCRM();
  const [name, setName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createPipeline.mutate(
      { name: name.trim(), productIds: selectedProducts },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setSelectedProducts([]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Kanban</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Nome do Kanban *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Funil de Vendas - Produto X" />
          </div>

          {products.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground uppercase mb-1.5 block">
                Associar produtos (leads de compradores cairão automaticamente)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {products.map((p: any) => {
                  const selected = selectedProducts.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {p.name}
                      {selected && <X className="h-3 w-3 ml-1 inline" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Quando um lead comprar um produto associado, ele será direcionado automaticamente para este Kanban.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || createPipeline.isPending}>
              {createPipeline.isPending ? "Criando..." : "Criar Kanban"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
