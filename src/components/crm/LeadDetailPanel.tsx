import { useState } from "react";
import { X, User, Clock, ShoppingCart, Tag, MessageSquare, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLeadDetail, useCRM } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

interface Props {
  lead: any;
  onClose: () => void;
}

export default function LeadDetailPanel({ lead, onClose }: Props) {
  const { history, notes, purchases } = useLeadDetail(lead.id);
  const { addNote, tags, addTag, removeTag, updateLead } = useCRM();
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(lead.name);
  const [editPhone, setEditPhone] = useState(lead.phone || "");
  const [editEmail, setEditEmail] = useState(lead.email || "");

  const leadTags = (lead.lead_tag_assignments || []).map((a: any) => a.lead_tags || a.tag_id);
  const leadTagIds = new Set(leadTags.map((t: any) => t.id));
  const availableTags = (tags || []).filter((t: any) => !leadTagIds.has(t.id));

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ leadId: lead.id, content: noteText.trim() });
    setNoteText("");
  };

  const handleSaveEdit = () => {
    updateLead.mutate({ id: lead.id, name: editName, phone: editPhone, email: editEmail });
    setEditing(false);
  };

  const totalPurchases = purchases.reduce((sum: number, p: any) => sum + (p.conversions?.amount || 0), 0);

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
                Criado em: {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-5 mb-4">
              <TabsTrigger value="details" className="text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
              <TabsTrigger value="purchases" className="text-xs">Compras</TabsTrigger>
              <TabsTrigger value="tags" className="text-xs">Tags</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">Notas</TabsTrigger>
            </TabsList>

            {/* DETAILS */}
            <TabsContent value="details" className="space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase mb-1 block">Nome</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase mb-1 block">E-mail</label>
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase mb-1 block">Telefone</label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Nome" value={lead.name} />
                    <InfoField label="E-mail" value={lead.email} />
                    <InfoField label="Telefone" value={lead.phone} />
                    <InfoField label="Origem" value={lead.source} />
                    <InfoField label="Valor Total" value={`R$ ${Number(lead.total_value || 0).toFixed(2)}`} highlight />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs">Editar</Button>
                </div>
              )}

              {/* UTMs from purchases */}
              {purchases.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Dados de Rastreamento (UTM)
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Source</span><br /><span className="text-primary">{purchases[0]?.conversions?.utm_source || "—"}</span></div>
                    <div><span className="text-muted-foreground">Medium</span><br />{purchases[0]?.conversions?.utm_medium || "—"}</div>
                    <div><span className="text-muted-foreground">Campaign</span><br />{purchases[0]?.conversions?.utm_campaign || "—"}</div>
                    <div><span className="text-muted-foreground">Content</span><br />{purchases[0]?.conversions?.utm_content || "—"}</div>
                    <div><span className="text-muted-foreground">Term</span><br />{purchases[0]?.conversions?.utm_term || "—"}</div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* HISTORY */}
            <TabsContent value="history">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex gap-3 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-foreground">{h.details || h.action}</p>
                        <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PURCHASES */}
            <TabsContent value="purchases">
              <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Total acumulado</p>
                <p className="text-lg font-bold text-primary">R$ {totalPurchases.toFixed(2)}</p>
              </div>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma compra.</p>
              ) : (
                <div className="space-y-2">
                  {purchases.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">{p.conversions?.product_name || "—"}</p>
                          <p className="text-muted-foreground">{p.conversions?.platform} · {p.conversions?.payment_method || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-primary">R$ {Number(p.conversions?.amount || 0).toFixed(2)}</p>
                          <p className="text-muted-foreground">{p.conversions?.paid_at ? new Date(p.conversions.paid_at).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAGS */}
            <TabsContent value="tags">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {leadTags.map((t: any) => (
                    <Badge key={t.id} variant="secondary" className="gap-1 text-xs" style={{ borderColor: t.color, color: t.color }}>
                      {t.name}
                      <button onClick={() => removeTag.mutate({ leadId: lead.id, tagId: t.id })} className="ml-0.5 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
                {availableTags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Adicionar tag:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((t: any) => (
                        <button key={t.id} onClick={() => addTag.mutate({ leadId: lead.id, tagId: t.id })}
                          className="text-xs px-2 py-1 rounded-full border border-border hover:bg-accent transition-colors"
                          style={{ borderColor: t.color + "50", color: t.color }}>
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* NOTES */}
            <TabsContent value="notes">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Textarea placeholder="Escreva uma anotação..." value={noteText} onChange={(e) => setNoteText(e.target.value)} className="text-sm min-h-[80px]" />
                </div>
                <Button size="sm" onClick={handleSaveNote} disabled={!noteText.trim()} className="text-xs">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Salvar
                </Button>
                <div className="space-y-2 mt-4">
                  {notes.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                      <p className="text-foreground">{n.content}</p>
                      <p className="text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className={cn("text-sm", highlight ? "font-semibold text-primary" : "text-foreground")}>{value || "—"}</p>
    </div>
  );
}
