
# Reestruturacao Completa do Modulo Agente de IA

## Resumo
Redesign completo da interface de criacao/edicao de Agentes de IA, com UX aprimorada, fluxo visual inspirado em n8n, prompts pre-configurados robustos, selecao de modelos organizada por provedor, e melhorias na pagina de Dispositivos.

---

## 1. Reestruturacao da Interface do AgentEditor

**Problema atual:** Modal unico (max-w-2xl) com tudo amontoado, hierarquia visual fraca, espaçamento inconsistente.

**Solucao:** Transformar o editor de agente em uma pagina full-screen (rota `/ai-agents/new` e `/ai-agents/:id/edit`) em vez de modal, com layout em duas colunas:
- Coluna esquerda: Configuracao por secoes (accordions/cards separados)
- Coluna direita: Preview do fluxo visual em tempo real

**Secoes organizadas com cards separados:**
1. **Informacoes Basicas** - Nome, descricao
2. **Trigger** - Cards visuais para selecao do gatilho
3. **Modelo de IA** - Selecao de API Key + modelo organizado por provedor
4. **Prompt Principal** - Templates pre-configurados + editor
5. **Contexto do Produto** - Campos para produto, proposta de valor, objecoes
6. **Configuracoes** - Tom de voz, emojis, limites
7. **Acoes** - Blocos de acao pos-processamento

---

## 2. Fluxo Visual (Inspirado n8n)

Implementar um diagrama de fluxo interativo na coluna direita do editor usando componentes React puros (sem biblioteca pesada de fluxo):
- Blocos conectados por linhas SVG: **Trigger -> Agente IA -> Acoes**
- Cada bloco clicavel, rola para a secao correspondente no formulario
- Blocos de acao podem ser adicionados/removidos visualmente
- Conexoes visuais com setas animadas entre os blocos
- Cores distintas: azul (trigger), roxo (IA), verde (acoes)

---

## 3. Selecao de Modelo Organizada por Provedor

Substituir o campo de texto livre por um select agrupado:

```text
OpenAI
  |-- GPT-4o
  |-- GPT-4o Mini
  |-- GPT-3.5 Turbo
Anthropic
  |-- Claude 3.5 Sonnet
  |-- Claude 3 Haiku
Groq
  |-- Llama 3.1 70B
  |-- Llama 3.1 8B
  |-- Mixtral 8x7B
```

Incluir opcao de selecionar modelo para **leitura** (interpretar mensagem) e modelo para **resposta** (gerar resposta), permitindo cenarios hibridos.

Adicionar botao "Criar nova API Key" ao lado do select de API Key, com link direto para `/settings?tab=apis`.

---

## 4. Prompts Pre-configurados Robustos

Expandir os 3 templates existentes com prompts completos:

**Assistente Comercial:**
- Objetivo, tom de voz, estrategia de conducao
- Coleta de dados (nome, interesse, orcamento)
- Tratamento de objecoes, fechamento
- Restricoes (nao prometer o que nao pode cumprir)

**Suporte ao Cliente:**
- Empatia, resolucao na primeira interacao
- Escalonamento quando necessario
- Coleta de protocolo/dados

**Qualificacao de Lead:**
- Perguntas de qualificacao (BANT)
- Classificacao de temperatura
- Direcionamento pos-qualificacao

Cada template tera campos adicionais editaveis:
- Informacoes do produto/servico
- Proposta de valor
- Objecoes comuns e respostas
- Diferenciais competitivos

---

## 5. Secao "Como Funciona" Aprimorada

Reescrever o tutorial com orientacoes praticas:
- Explicacao clara do fluxo Trigger -> IA -> Acao
- Alertas sobre boas praticas do WhatsApp
- Texto: "Evite spam em massa, mensagens repetitivas e linguagem agressiva para nao comprometer seu numero"
- Dicas de uso responsavel

---

## 6. Melhorias nos Dispositivos

- Filtrar dispositivos por `project_id` (atualmente filtra so por `account_id`)
- Nota explicativa sobre Evolution API: "A conexao com WhatsApp requer um servidor externo com Evolution API instalada. O Nexus Metrics nao hospeda a instancia — voce precisa de seu proprio servidor ou de um provedor de Evolution API."
- Validacao de status de conexao ao abrir a pagina

---

## 7. Verificacao do Backend (Trigger)

O backend (`agent-execute`) ja esta funcional. Ajustes:
- Garantir que o trigger `whatsapp` busque dispositivo pelo `project_id` alem de `account_id`
- Atualizar a edge function para filtrar dispositivo por projeto

---

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| `src/pages/AIAgents.tsx` | Reescrita completa - novo layout full-page com editor em secoes |
| `src/pages/Devices.tsx` | Filtro por project_id, nota sobre servidor externo |
| `src/hooks/useAIAgents.tsx` | Filtrar dispositivos por project_id |
| `supabase/functions/agent-execute/index.ts` | Filtrar device por project_id |

Nenhuma migracao de banco necessaria - a estrutura de tabelas ja suporta tudo.

---

## Detalhes Tecnicos

- O fluxo visual sera implementado com divs posicionados e SVG paths (sem dependencia externa)
- O select de modelos usara `SelectGroup` + `SelectLabel` do Radix para agrupamento por provedor
- Os prompts expandidos serao constantes no frontend, sem persistencia adicional
- Campos de contexto (produto, objecoes) serao armazenados dentro do `ai_config` JSONB existente
- Link "Criar API Key" usara `react-router-dom` navigate para `/settings?tab=apis`
- Layout responsivo: em mobile, coluna unica com fluxo visual colapsavel
