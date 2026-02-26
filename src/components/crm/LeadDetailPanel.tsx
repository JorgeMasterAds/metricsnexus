import { useState } from "react";
import { X, User, Clock, ShoppingCart, Tag, MessageSquare, ExternalLink, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLeadDetail, useCRM } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

interface Props {
  lead: any;
  onClose: () => void;
}

export default function LeadDetailPanel({ lead, onClose }: Props) {
  const { history, notes, purchases } = useLeadDetail(lead.id);
  const { addNote, tags, addTag, removeTag, updateLead, deleteLead } = useCRM();
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(lead.name);
  const [editPhone, setEditPhone] = useState(lead.phone || "");
  const [editEmail, setEditEmail] = useState(lead.email || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const leadTags = (lead.lead_tag_assignments || []).map((a: any) => a.lead_tags || a.tag_id);
  const leadTagIds = new Set(leadTags.map((t: any) => t.id));
  const availableTags = (tags || []).filter((t: any) => !leadTagIds.has(t.id));

  const totalPurchases = purchases.reduce((sum: number, p: any) => sum + (p.conversions?.amount || 0), 0);

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ leadId: lead.id, content: noteText.trim() });
    setNoteText("");
  };

  const handleSaveEdit = () => {
    updateLead.mutate({ id: lead.id, name: editName, phone: editPhone, email: editEmail });
    setEditing(false);
  };

  const handleDelete = () => {
    deleteLead.mutate(lead.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{lead.name}</h2>
              <p className="text-xs text-muted-foreground">
                Criado em {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="details" className="text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
            </TabsList>

            {/* ── DETALHES (unified) ── */}
            <TabsContent value="details" className="space-y-5">
              {/* Contact info */}
              {editing ? (
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div>
                    <Label className="text-xs">Nome Completo</Label>
                    <Input className="mt-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail</Label>
                    <Input className="mt-1" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input className="mt-1" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveEdit}>Salvar Alterações</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <InfoField label="Nome Completo" value={lead.name} />
                    <InfoField label="E-mail" value={lead.email} />
                    <InfoField label="Telefone" value={lead.phone} />
                    <InfoField label="Origem" value={lead.source} />
                    <InfoField label="Valor Total" value={`R$ ${Number(lead.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} highlight />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs mt-2">
                    Editar
                  </Button>
                </div>
              )}

              {/* Purchases summary */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Compras
                  </h3>
                  <span className="text-sm font-bold text-primary">
                    R$ {totalPurchases.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {purchases.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma compra registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {purchases.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-xs">
                        <div>
                          <p className="font-medium text-foreground">{p.conversions?.product_name || "—"}</p>
                          <p className="text-muted-foreground">{p.conversions?.platform} · {p.conversions?.payment_method || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-primary">R$ {Number(p.conversions?.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          <p className="text-muted-foreground">{p.conversions?.paid_at ? new Date(p.conversions.paid_at).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UTM data */}
              {purchases.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Dados de Rastreamento (UTM)
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <UtmField label="Origem (Source)" value={purchases[0]?.conversions?.utm_source} />
                    <UtmField label="Mídia (Medium)" value={purchases[0]?.conversions?.utm_medium} />
                    <UtmField label="Campanha" value={purchases[0]?.conversions?.utm_campaign} />
                    <UtmField label="Conteúdo" value={purchases[0]?.conversions?.utm_content} />
                    <UtmField label="Termo" value={purchases[0]?.conversions?.utm_term} />
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {leadTags.map((t: any) => (
                    <Badge key={t.id} variant="secondary" className="gap-1 text-xs" style={{ borderColor: t.color, color: t.color }}>
                      {t.name}
                      <button onClick={() => removeTag.mutate({ leadId: lead.id, tagId: t.id })} className="ml-0.5 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                  {leadTags.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tag.</p>}
                </div>
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableTags.slice(0, 10).map((t: any) => (
                      <button key={t.id} onClick={() => addTag.mutate({ leadId: lead.id, tagId: t.id })}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:bg-accent transition-colors"
                        style={{ borderColor: t.color + "50", color: t.color }}>
                        + {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Anotações Internas
                </h3>
                <Textarea
                  placeholder="Escreva detalhes sobre a negociação..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
                <Button size="sm" onClick={handleSaveNote} disabled={!noteText.trim()} className="text-xs">
                  Salvar anotação
                </Button>
                {notes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {notes.map((n: any) => (
                      <div key={n.id} className="p-2.5 rounded-lg bg-muted/30 text-xs">
                        <p className="text-foreground">{n.content}</p>
                        <p className="text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── HISTÓRICO ── */}
            <TabsContent value="history">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro no histórico.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">{formatAction(h.action)}</p>
                            <p className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(h.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          {h.details && <p className="text-xs text-muted-foreground mt-0.5">{h.details}</p>}
                        </div>
                      </div>
                      {h.metadata && (
                        <details className="group">
                          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            Ver dados completos (JSON)
                          </summary>
                          <pre className="mt-1.5 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground overflow-x-auto max-h-[200px]">
                            {JSON.stringify(h.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete lead confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead "{lead.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as notas, tags e histórico deste lead serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoField({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-sm", highlight ? "font-semibold text-primary" : "text-foreground")}>{value || "—"}</p>
    </div>
  );
}

function UtmField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={value ? "text-primary font-medium" : "text-muted-foreground"}>{value || "—"}</p>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    created: "Lead criado",
    purchase: "Nova compra",
    stage_change: "Movido de etapa",
    note_added: "Anotação adicionada",
    tag_added: "Tag adicionada",
    tag_removed: "Tag removida",
    updated: "Lead atualizado",
  };
  return map[action] || action;
}
