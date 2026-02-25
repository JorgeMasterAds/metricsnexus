import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCRM } from "@/hooks/useCRM";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateLeadModal({ open, onOpenChange }: Props) {
  const { createLead } = useCRM();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    createLead.mutate(
      { name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, source: source.trim() || undefined },
      { onSuccess: () => { onOpenChange(false); setName(""); setEmail(""); setPhone(""); setSource(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase mb-1 block">E-mail</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Telefone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Origem</label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="instagram, google_ads..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || createLead.isPending}>
              {createLead.isPending ? "Salvando..." : "Criar Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
