import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string; avatar_url: string | null; is_active: boolean } | null;
}

export default function EditProjectModal({ open, onOpenChange, project }: Props) {
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (project) {
      setName(project.name);
      setAvatarPreview(project.avatar_url);
      setAvatarFile(null);
    }
  }, [project]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const hasChanges = project && (name.trim() !== project.name || avatarFile !== null);

  const handleSave = async () => {
    if (!project || !name.trim()) return;
    setSaving(true);
    try {
      let avatarUrl = project.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `projects/${project.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      }
      const { error } = await (supabase as any).from("projects").update({ name: name.trim(), avatar_url: avatarUrl }).eq("id", project.id);
      if (error) throw error;
      toast({ title: "Projeto atualizado!" });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["sidebar-active-project"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (activate: boolean) => {
    if (!project) return;
    if (!activate) {
      setShowDeactivate(true);
      return;
    }
    await (supabase as any).from("projects").update({ is_active: true }).eq("id", project.id);
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast({ title: "Projeto reativado!" });
  };

  const confirmDeactivate = async () => {
    if (!project) return;
    await (supabase as any).from("projects").update({ is_active: false }).eq("id", project.id);
    qc.invalidateQueries({ queryKey: ["projects"] });
    setShowDeactivate(false);
    toast({ title: "Projeto desativado" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Projeto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="flex justify-center">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="h-20 w-20 rounded-xl bg-muted/50 border-2 border-dashed border-border/50 overflow-hidden flex items-center justify-center transition-colors group-hover:border-primary/50">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">Alterar foto</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome do projeto <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Meu Produto Principal" autoFocus />
            </div>

            {project && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                <div>
                  <p className="text-xs font-medium">Status do projeto</p>
                  <p className="text-[10px] text-muted-foreground">{project.is_active ? "Ativo" : "Desativado"}</p>
                </div>
                {project.is_active ? (
                  <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleToggleActive(false)}>
                    Desativar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleToggleActive(true)}>
                    Reativar
                  </Button>
                )}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || !name.trim() || !hasChanges} className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90">
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar projeto "{project?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja desativar este projeto? Os seguintes impactos ocorrerão:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Webhooks deixarão de processar eventos</li>
                <li>Dashboard não computará novos dados</li>
                <li>Smart Links deixarão de funcionar</li>
                <li>Projeto desaparecerá do menu lateral</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">Você pode reativar o projeto a qualquer momento.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
