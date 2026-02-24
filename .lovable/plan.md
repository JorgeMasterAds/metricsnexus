
# Nexus Metrics -- Reconstrucao Completa do Backend

## Visao Geral

Reconstrucao completa do backend do Nexus Metrics no Supabase externo ja conectado (`fnpmuffrqrlofjvqytof`), com arquitetura multi-tenant, tracking de conversoes, webhooks, integracao com plataformas de trafego pago e dashboards analiticos.

Devido ao tamanho do projeto, a implementacao sera dividida em **5 fases incrementais**. Cada fase sera funcional de forma independente.

---

## Fase 1 -- Schema do Banco de Dados (Migration SQL)

### 1.1 Enums

- `app_role`: owner, admin, member
- `subscription_status`: active, canceled, past_due, trialing
- `conversion_status`: approved, refunded, chargedback, canceled, pending
- `ad_platform`: meta, google, tiktok, other
- `integration_provider`: meta_ads, google_ads, hotmart, eduzz, kiwify, monetizze, other
- `payout_status`: pending, approved, paid, rejected

### 1.2 Tabelas Principais (todas com UUID PK, created_at, updated_at)

```text
accounts
  id, name, slug, timezone, tax_rate, created_at, updated_at

profiles (vincula auth.users)
  id (FK auth.users), full_name, avatar_url, created_at, updated_at

account_users
  id, account_id (FK accounts), user_id (FK auth.users), role (app_role), invited_at, accepted_at

user_roles (seguranca RLS)
  id, user_id (FK auth.users), role (app_role)

subscriptions
  id, account_id (FK accounts), plan_type, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id

usage_limits
  id, account_id (FK accounts), max_dashboards, max_users, max_webhooks, max_smartlinks

dashboards
  id, account_id (FK accounts), name, config (jsonb), created_by (FK auth.users)

products
  id, account_id (FK accounts), external_id, name, platform, cost, created_at

product_costs
  id, product_id (FK products), account_id, cost, effective_from

taxes
  id, account_id (FK accounts), name, rate, is_default

pixels
  id, account_id (FK accounts), name, platform, pixel_id, config (jsonb)

smartlinks
  id, account_id (FK accounts), name, slug (unique), is_active, created_by

smartlink_variants
  id, smartlink_id (FK smartlinks), account_id, name, url, weight, is_active

clicks (utm_events)
  id, account_id (FK accounts), smartlink_id (FK smartlinks), variant_id (FK smartlink_variants),
  click_id (unique), utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  referrer, ip, user_agent, device_type, country, created_at

conversions
  id, account_id (FK accounts), click_id, smartlink_id, variant_id,
  transaction_id (unique), platform, product_name, amount, currency,
  status (conversion_status), is_order_bump, paid_at, raw_payload (jsonb)

conversion_items
  id, conversion_id (FK conversions), account_id, product_name, amount, is_order_bump, product_id (FK products nullable)

conversion_events (audit log)
  id, transaction_id, event_type, account_id, raw_payload (jsonb), created_at

webhook_logs
  id, account_id (FK accounts nullable), platform, raw_payload (jsonb), status, ignore_reason, event_type, transaction_id, created_at

integrations
  id, account_id (FK accounts), provider (integration_provider), access_token_encrypted, refresh_token_encrypted, expires_at, external_account_id, config (jsonb)

ad_accounts
  id, account_id (FK accounts), integration_id (FK integrations), platform (ad_platform), external_account_id, name

ad_spend
  id, account_id (FK accounts), ad_account_id (FK ad_accounts), campaign_id, campaign_name, adset_name, ad_name, spend, impressions, clicks, date, platform (ad_platform)

daily_metrics
  id, date, account_id (FK accounts), smartlink_id, variant_id, views, conversions, revenue

referral_codes
  id, account_id (FK accounts), code (unique), is_active

referrals
  id, referrer_account_id (FK accounts), referred_account_id (FK accounts), referral_code_id (FK referral_codes), created_at

commissions
  id, referral_id (FK referrals), account_id, amount, period_start, period_end, status

payout_requests
  id, account_id (FK accounts), amount, status (payout_status), requested_at, paid_at

notification_settings
  id, account_id (FK accounts), user_id (FK auth.users), daily_report_time, channel (email/webhook), webhook_url

system_announcements
  id, title, body, published_at

system_announcement_reads
  id, announcement_id (FK system_announcements), user_id (FK auth.users), read_at
```

### 1.3 Indices

- clicks: utm_source, utm_medium, utm_campaign, created_at, smartlink_id, account_id
- conversions: transaction_id (unique), product_name, account_id, created_at
- ad_spend: campaign_id, date, account_id, platform
- daily_metrics: date, account_id, smartlink_id
- webhook_logs: account_id, created_at
- smartlinks: slug (unique), account_id

### 1.4 Triggers

- Auto-criar profile e account ao signup (trigger on auth.users insert)
- Auto-atualizar updated_at em todas as tabelas relevantes
- Validacao de usage_limits antes de insert em smartlinks, dashboards, account_users

### 1.5 RLS (Row Level Security)

Todas as tabelas terao RLS habilitado com isolamento por `account_id`:

- Funcao `has_role(user_id, role)` -- security definer
- Funcao `get_user_account_ids(user_id)` -- retorna array de account_ids do usuario (security definer)
- Policies: SELECT/INSERT/UPDATE/DELETE filtrados por `account_id IN (get_user_account_ids(auth.uid()))`
- system_announcements: SELECT publico, INSERT apenas admin do sistema

---

## Fase 2 -- Edge Functions

### 2.1 webhook-ingest (substituir webhook atual)
- Recebe POST de Hotmart, Eduzz, Kiwify, Monetizze
- Detecta plataforma automaticamente pelo payload
- Normaliza dados em conversions e conversion_items
- Loga payload bruto em webhook_logs
- Trata eventos positivos (aprovado) e negativos (reembolso, chargeback, cancelamento)
- Valida x-webhook-secret vinculado a account

### 2.2 redirect (smartlink)
- Recebe slug, resolve smartlink, aplica rotacao A/B por peso
- Registra click com UTM completo, IP, user-agent, device, country (via header)
- Redireciona para URL da variante selecionada

### 2.3 calculate-metrics
- Agrega metricas diarias: receita bruta, liquida, lucro, ROI, ROAS, CPA, ticket medio, taxa conversao, LTV estimado
- Considera custo do produto (product_costs), taxa (taxes) e custo de trafego (ad_spend)

### 2.4 sync-ad-spend
- Recebe tokens OAuth de integrations
- Busca dados do Meta Ads e Google Ads
- Armazena em ad_spend por campanha/dia

### 2.5 check-subscription (atualizar existente)
- Valida plano ativo e limites de uso

### 2.6 affiliate-commission
- Calcula comissao recorrente por 6 meses sobre assinaturas indicadas
- Gera registros em commissions

---

## Fase 3 -- Autenticacao e Multi-Tenant

### 3.1 Auth com Supabase Auth
- Signup com criacao automatica de account + profile + account_users (owner)
- Login com email/senha
- Suporte a 2FA (TOTP via Supabase Auth MFA)
- Reset de senha com pagina /reset-password (ja existe)

### 3.2 Convite de Usuarios
- Owner/admin convida por email
- Cria registro em account_users com role
- Limite de 3 usuarios por account no plano padrao (validado via usage_limits)

### 3.3 Atualizar Frontend
- ProjectProvider substituido por AccountProvider (contexto multi-tenant)
- Todas as queries filtradas por account_id do contexto
- Corrigir todos os erros de TypeScript (types.ts sera atualizado automaticamente apos migrations)

---

## Fase 4 -- Dashboard e Analytics (Frontend)

### 4.1 Atualizar paginas existentes
- Dashboard.tsx: usar novas tabelas com account_id
- SmartLinks.tsx: CRUD com novas tabelas
- WebhookLogs.tsx: filtrar por account_id
- UtmReport.tsx: usar clicks (utm_events) com novos campos
- Settings.tsx: configuracao de account, taxes, product_costs

### 4.2 Novas metricas no Dashboard
- Receita bruta vs liquida
- Lucro (receita - custo produto - taxa - imposto - custo trafego)
- ROI, ROAS, CPA
- LTV estimado
- Filtros por produto, utm_campaign, utm_source, smartlink

---

## Fase 5 -- Modulos Complementares

### 5.1 Sistema de Afiliados
- Pagina de referral com codigo unico
- Visualizacao de comissoes e payout requests

### 5.2 Notificacoes
- Configuracao de horario de relatorio diario
- Envio via email ou webhook (edge function com cron)

### 5.3 System Announcements (Changelog)
- Exibicao de anuncios nao lidos
- Marcacao como lido por usuario

### 5.4 Integracoes (Meta/Google Ads)
- Tela de configuracao de OAuth tokens
- Sincronizacao manual e automatica de ad_spend

---

## Detalhes Tecnicos

### Ordem de Execucao

1. **Migration SQL** -- Criar todas as tabelas, enums, indices, triggers, RLS policies e funcoes em uma unica migration organizada
2. **Edge Functions** -- webhook-ingest, redirect, calculate-metrics, sync-ad-spend
3. **Auth + Multi-tenant** -- Signup trigger, AccountProvider, convites
4. **Frontend** -- Atualizar todas as paginas para usar account_id e novas tabelas
5. **Modulos extras** -- Afiliados, notificacoes, changelog

### Payload Webhook Hotmart (exemplo)

```text
{
  "event": "PURCHASE_APPROVED",
  "data": {
    "purchase": {
      "transaction": "HP1234567890",
      "order_date": "2025-01-15T10:30:00Z",
      "price": { "value": 197.00, "currency_value": "BRL" },
      "sck": "click_abc123"
    },
    "product": { "name": "Curso Completo", "id": 12345 }
  }
}
```

### Payload Meta Ads Sync (exemplo)

```text
GET /v21.0/act_{ad_account_id}/insights
  ?fields=campaign_id,campaign_name,spend,impressions,clicks
  &time_range={"since":"2025-01-01","until":"2025-01-31"}
  &level=campaign

Resposta armazenada em ad_spend:
{
  campaign_id: "12345",
  campaign_name: "Campanha Teste",
  spend: 150.00,
  impressions: 5000,
  clicks: 200,
  date: "2025-01-15",
  platform: "meta"
}
```

### Arquitetura Multi-Tenant

```text
auth.users (Supabase gerenciado)
     |
     v
profiles (1:1 com auth.users)
     |
     v
account_users (N:N -- um usuario pode pertencer a varias accounts)
     |
     v
accounts (entidade central -- todos os dados filtrados por account_id)
     |
     +-- smartlinks, clicks, conversions, products, ad_spend, etc.
```

### Consideracoes de Seguranca

- RLS em todas as tabelas com isolamento por account_id
- Funcoes security definer para evitar recursao infinita em policies
- Tokens OAuth armazenados em campos encrypted (integrations)
- Webhook secret por account para validacao
- Rate limiting nas edge functions
- 2FA via Supabase Auth MFA

### Correcao dos Build Errors Atuais

Todos os erros de TypeScript serao resolvidos automaticamente quando as migrations forem executadas, pois o arquivo `src/integrations/supabase/types.ts` sera regenerado com as definicoes corretas das novas tabelas. O codigo existente em Dashboard, SmartLinks, Settings, etc. sera adaptado para usar `account_id` em vez de `project_id`/`user_id`.
