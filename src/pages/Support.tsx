import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { MessageCircle, Mail, BookOpen, GraduationCap, ExternalLink, Send, Bug, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/hooks/useAccount";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const WHATSAPP_URL = "https://wa.me/5511959939693?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Nexus%20Metrics";
const SUPPORT_EMAIL = "nexusmetrics@jmads.com.br";

export default function Support() {
  const { toast } = useToast();
  const { activeAccountId } = useAccount();
  const [category, setCategory] = useState("suggestion");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => { const { data } = await supabase.auth.getUser(); return data.user; },
  });

  const submitTicket = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error } = await (supabase as any).from("support_tickets").insert({
        user_id: user?.id,
        account_id: activeAccountId,
        category,
        subject: subject.trim(),
        body: body.trim(),
      });
      if (error) throw error;
      toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
      setSubject("");
      setBody("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const categoryIcons: Record<string, any> = {
    suggestion: Lightbulb,
    complaint: AlertTriangle,
    bug: Bug,
  };

  return (
    <DashboardLayout title="Suporte" subtitle="Central de ajuda e atendimento">
      <div className="space-y-6">
        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* WhatsApp */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></div>
              <h3 className="text-sm font-semibold">WhatsApp</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-5">Fale diretamente com nossa equipe pelo WhatsApp para suporte rápido.</p>
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => window.open(WHATSAPP_URL, "_blank")}>
              Abrir WhatsApp <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {/* Email */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
              <h3 className="text-sm font-semibold">E-mail</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-5">Envie sua dúvida ou solicitação detalhada por e-mail.</p>
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=Suporte%20Nexus%20Metrics`, "_blank")}>
              Enviar e-mail <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {/* Documentação - disabled */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 flex flex-col opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground"><BookOpen className="h-5 w-5" /></div>
              <h3 className="text-sm font-semibold">Documentação</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-5">Consulte guias e referências técnicas da plataforma.</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 cursor-not-allowed" disabled>
                  Em breve
                </Button>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
          </div>

          {/* Tutoriais - disabled */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 flex flex-col opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground"><GraduationCap className="h-5 w-5" /></div>
              <h3 className="text-sm font-semibold">Tutoriais</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-5">Aprenda a usar cada recurso com tutoriais passo a passo.</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 cursor-not-allowed" disabled>
                  Em breve
                </Button>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Enviar mensagem
          </h3>
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">💡 Sugestão</SelectItem>
                    <SelectItem value="complaint">⚠️ Reclamação</SelectItem>
                    <SelectItem value="bug">🐛 Relato de Bug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assunto</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Resumo da sua mensagem" className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Descreva com detalhes..." className="text-xs min-h-[120px]" />
            </div>
            <Button onClick={submitTicket} disabled={sending || !subject.trim() || !body.trim()} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {sending ? "Enviando..." : "Enviar mensagem"}
            </Button>
          </div>
        </div>

        {/* Quick help */}
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 text-center">
          <h3 className="text-sm font-semibold mb-2">Precisa de ajuda rápida?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Nossa equipe está disponível de segunda a sexta, das 9h às 18h.
          </p>
          <Button
            className="gradient-bg border-0 text-primary-foreground hover:opacity-90 gap-2"
            onClick={() => window.open(WHATSAPP_URL, "_blank")}
          >
            <MessageCircle className="h-4 w-4" />
            Falar com suporte
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
