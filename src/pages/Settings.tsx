import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, User, Camera, Shield, Building2, CreditCard, Users, Plus, Trash2, Edit2 } from "lucide-react";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useAccount } from "@/hooks/useAccount";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeAccount, activeAccountId } = useAccount();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "personal";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  // --- Auth user & profile ---
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => { const { data } = await supabase.auth.getUser(); return data.user; },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => { const { data } = await (supabase as any).from("profiles").select("*").maybeSingle(); return data; },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setAvatarUrl(profile.avatar_url || ""); }
    if (user) { setEmail(user.email || ""); }
  }, [profile, user]);

  useEffect(() => {
    if (activeAccount) {
      setOrgName(activeAccount.name || "");
      setCompanyName(activeAccount.company_name || "");
      setDocNumber(activeAccount.cnpj || "");
      setPhone(activeAccount.phone || "");
      setAddress(activeAccount.address || "");
      setResponsibleName(activeAccount.responsible_name || "");
      setAdminEmail(activeAccount.admin_email || "");
    }
  }, [activeAccount]);

  // --- Projects ---
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("projects").select("*").eq("account_id", activeAccountId).order("created_at");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // --- Subscription & Plan ---
  const { data: subscription } = useQuery({
    queryKey: ["subscription", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("subscriptions").select("*, plans:plan_id(*)").eq("account_id", activeAccountId).maybeSingle();
      return data;
    },
    enabled: !!activeAccountId,
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => { const { data } = await (supabase as any).from("plans").select("*").order("price"); return data || []; },
  });

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await (supabase as any).from("super_admins").select("id").eq("user_id", userData.user.id).maybeSingle();
      return !!data;
    },
  });

  // --- Team members ---
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("account_users").select("*, profiles:user_id(full_name, avatar_url)").eq("account_id", activeAccountId);
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // --- Actions ---
  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await (supabase as any).from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast({ title: "Foto atualizada!" });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await (supabase as any).from("profiles").update({ full_name: fullName }).eq("id", user?.id);
      if (email !== user?.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
        toast({ title: "Email atualizado", description: "Verifique o novo email para confirmar." });
      }
      toast({ title: "Perfil atualizado!" });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveOrganization = async () => {
    if (!activeAccount) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("accounts").update({
        name: orgName, company_name: companyName, cnpj: docNumber,
        phone, address, responsible_name: responsibleName, admin_email: adminEmail,
      }).eq("id", activeAccount.id);
      if (error) throw error;
      toast({ title: "Organização atualizada!" });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Senhas diferentes", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "A senha deve ter no mínimo 8 caracteres", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const createProject = async () => {
    if (!activeAccountId) return;
    const projectName = prompt("Nome do projeto:");
    if (!projectName?.trim()) return;
    const { error } = await (supabase as any).from("projects").insert({ account_id: activeAccountId, name: projectName.trim() });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Projeto criado!" });
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Excluir este projeto?")) return;
    await (supabase as any).from("projects").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast({ title: "Projeto excluído" });
  };

  const toggleProject = async (id: string, isActive: boolean) => {
    await (supabase as any).from("projects").update({ is_active: !isActive }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const tabs = [
    { key: "personal", label: "Dados Pessoais", icon: User },
    { key: "organization", label: "Minha Organização", icon: Building2 },
    { key: "subscription", label: "Assinatura", icon: CreditCard },
    { key: "team", label: "Equipe", icon: Users },
  ];

  return (
    <DashboardLayout
      title="Configurações"
      subtitle="Gerencie sua conta e organização"
      actions={<ProductTour {...TOURS.settings} triggerLabel="Tutorial" />}
    >
      <div className="flex items-center gap-1 mb-6 border-b border-border/50 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== PERSONAL ===== */}
      {activeTab === "personal" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Dados Pessoais</h2>
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-muted/50 border-2 border-border/50 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
                </div>
                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Alterar senha</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" /></div>
              <div className="space-y-1.5"><Label>Confirmar</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" /></div>
            </div>
            <Button onClick={changePassword} disabled={saving || !newPassword} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">Alterar senha</Button>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar dados pessoais"}
          </Button>

          <div className="rounded-xl bg-card border border-destructive/30 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-1 text-destructive">Zona de Perigo</h2>
            <p className="text-xs text-muted-foreground mb-4">Ações irreversíveis da sua conta</p>
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Apagar conta</Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-destructive">Para confirmar, digite <strong>APAGAR MINHA CONTA</strong>:</p>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="APAGAR MINHA CONTA" className="border-destructive/50" />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => toast({ title: "Em desenvolvimento" })} disabled={deleteConfirm !== "APAGAR MINHA CONTA"}>Confirmar</Button>
                  <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ORGANIZATION ===== */}
      {activeTab === "organization" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Dados da Organização</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Nome da conta</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Minha Empresa" /></div>
                <div className="space-y-1.5"><Label>Razão Social</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Empresa LTDA" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Documento (CPF ou CNPJ)</Label>
                  <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                </div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
              </div>
              <div className="space-y-1.5"><Label>Endereço</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade - UF" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Responsável</Label><Input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>E-mail administrativo</Label><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
              </div>
            </div>
          </div>

          {/* Projects section */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Projetos</h2>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={createProject}>
                <Plus className="h-3.5 w-3.5" /> Novo Projeto
              </Button>
            </div>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum projeto criado.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleProject(p.id, p.is_active)} />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteProject(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={saveOrganization} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar organização"}
          </Button>
        </div>
      )}

      {/* ===== SUBSCRIPTION ===== */}
      {activeTab === "subscription" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Plano Atual</h2>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/30 mb-4">
              <div>
                <p className="text-lg font-bold capitalize">{subscription?.plans?.name || subscription?.plan_type || "Free"}</p>
                <p className="text-xs text-muted-foreground">
                  Status: <Badge variant="outline" className="text-[10px] ml-1 capitalize">{subscription?.status || "active"}</Badge>
                </p>
              </div>
              <p className="text-2xl font-bold">
                R$ {(subscription?.plans?.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                <span className="text-xs text-muted-foreground font-normal">/mês</span>
              </p>
            </div>
            {subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground">Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</p>
            )}
            {subscription?.stripe_subscription_id && (
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("customer-portal");
                  if (error) throw error;
                  if (data?.url) window.location.href = data.url;
                } catch (err: any) {
                  toast({ title: "Erro", description: err.message, variant: "destructive" });
                }
              }}>
                Gerenciar assinatura
              </Button>
            )}
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Planos Disponíveis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan: any) => {
                const isCurrentPlan = subscription?.plan_id === plan.id || (!subscription?.plan_id && plan.name === 'free');
                return (
                  <div key={plan.id} className={`p-4 rounded-xl border transition-colors ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}>
                    <h3 className="font-semibold capitalize mb-1">{plan.name}</h3>
                    <p className="text-xl font-bold mb-3">R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
                    <ul className="space-y-1">
                      {(plan.features || []).map((f: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-primary shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan ? (
                      <Badge className="w-full mt-3 justify-center text-xs">Plano atual</Badge>
                    ) : plan.name === 'free' ? null : (
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs" onClick={async () => {
                        if (!plan.stripe_price_id) {
                          toast({ title: "Plano indisponível", description: "Stripe ainda não configurado para este plano.", variant: "destructive" });
                          return;
                        }
                        try {
                          const { data, error } = await supabase.functions.invoke("create-checkout", {
                            body: { priceId: plan.stripe_price_id },
                          });
                          if (error) throw error;
                          if (data?.url) window.location.href = data.url;
                        } catch (err: any) {
                          toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
                        }
                      }}>
                        {subscription?.stripe_subscription_id ? "Alterar plano" : "Assinar"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isSuperAdmin && (
            <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Configuração Stripe (Super Admin)</h2>
              <p className="text-xs text-muted-foreground mb-3">Criar products e prices no Stripe e vincular aos planos.</p>
              <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("setup-stripe");
                  if (error) throw error;
                  toast({ title: "Stripe configurado!", description: JSON.stringify(data?.results?.map((r: any) => `${r.plan}: ${r.status}`)) });
                  refetchPlans();
                } catch (err: any) {
                  toast({ title: "Erro", description: err.message, variant: "destructive" });
                }
              }}>
                Configurar Stripe
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ===== TEAM ===== */}
      {activeTab === "team" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Membros da Equipe</h2>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast({ title: "Em breve", description: "Sistema de convites será implementado." })}>
                <Plus className="h-3.5 w-3.5" /> Convidar
              </Button>
            </div>
            {teamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum membro encontrado.</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {m.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                        <p className="text-[10px] text-muted-foreground">Entrou em {new Date(m.accepted_at || m.invited_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
