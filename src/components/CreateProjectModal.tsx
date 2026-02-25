import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/hooks/useAccount";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeAccountId } = useAccount();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim() || !activeAccountId) return;
    setSaving(true);
    try {
      // Check limit via edge function
      const { data: limitData, error: limitError } = await supabase.functions.invoke("check-user-limit", {
        body: {},
        headers: {},
      });

      let avatarUrl: string | null = null;

      // Upload avatar if selected
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `projects/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { error } = await (supabase as any).from("projects").insert({
        account_id: activeAccountId,
        name: name.trim(),
        avatar_url: avatarUrl,
      });
      if (error) throw error;

      toast({ title: "Projeto criado com sucesso!" });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setName("");
      setDescription("");
      setAvatarFile(null);
      setAvatarPreview(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao criar projeto", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Novo Projeto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <div className="h-20 w-20 rounded-xl bg-muted/50 border-2 border-dashed border-border/50 overflow-hidden flex items-center justify-center transition-colors group-hover:border-primary/50">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">Foto (opcional)</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nome do projeto <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Meu Produto Principal"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição do projeto..."
              rows={3}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90"
          >
            {saving ? "Criando..." : "Criar Projeto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
