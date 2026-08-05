# Meta D10 AI — Gestor de Trafego Inteligente com Orquestra de Agentes IA

## Descricao
Plataforma SaaS completa de gestao de trafego pago com IA. Orquestra de 14 agentes especialistas que se comunicam entre si, otimizando campanhas de forma autonoma para multiplas empresas. Cobre todos os objetivos do Meta Ads com foco em ROI.

## Stack
- React 19 + TypeScript
- Vite (bundler)
- Tailwind CSS v4 (estilizacao)
- Recharts (graficos)
- Lucide React (icones)
- React Router DOM (navegacao)
- Supabase (banco de dados + auth)

## Como rodar
```bash
cd ~/projetos-pain/meta-d10-ai
npm install
npm run dev
```
Abre em http://localhost:5173

## Variaveis de Ambiente (.env)
```
VITE_SUPABASE_URL=https://kqdyowpmjsdxttxbcxoz.supabase.co
VITE_SUPABASE_ANON_KEY=<chave no .env local>
```

## Estrutura do Projeto
```
src/
  App.tsx                 — layout principal com routing
  contexts/
    AppContext.tsx         — estado global (empresas, agentes, mensagens)
  types/
    meta.ts               — tipos Meta Ads (objetivos, campanhas, metricas)
    company.ts            — tipos empresa, metas, roles dos agentes
    agent.ts              — tipos mensagens, acoes, memoria dos agentes
  agents/
    communication.ts      — hub de comunicacao entre agentes
  lib/
    supabase.ts           — client Supabase
    mock-data.ts          — dados demo (3 empresas, campanhas, agentes)
  components/
    Sidebar.tsx            — menu lateral com navegacao
    Header.tsx             — barra superior com busca e filtros
    MetricCard.tsx         — cards de metricas reutilizavel
    PerformanceChart.tsx   — grafico de area investimento vs retorno
    CampaignTable.tsx      — tabela de campanhas
    AIInsights.tsx         — cards de insights da IA
  pages/
    Dashboard.tsx          — visao geral com graficos e metricas
    Companies.tsx          — cards de empresas com metas e progresso
    Campaigns.tsx          — tabela de todas as campanhas por objetivo
    Agents.tsx             — orquestra de agentes com status e comunicacao
    Creatives.tsx          — analise de performance de criativos
    Performance.tsx        — graficos CPL, ROAS, CTR ao longo do tempo
    ROITracker.tsx         — investimento vs retorno por empresa
    Funnel.tsx             — visualizacao TOFU/MOFU/BOFU
    Automations.tsx        — regras automaticas dos agentes
    Insights.tsx           — recomendacoes IA com nivel de confianca
    Communication.tsx      — central de mensagens entre agentes
    Settings.tsx           — config API Meta, limites, modo autonomo
```

## Banco de Dados (Supabase)
Projeto: d10-meta-ai (sa-east-1)
ID: kqdyowpmjsdxttxbcxoz

### Tabelas
- `companies` — empresas/clientes
- `company_goals` — metas por empresa
- `campaigns` — campanhas por objetivo
- `campaign_metrics` — metricas diarias por campanha
- `ad_sets` — conjuntos de anuncios
- `ads` — anuncios individuais
- `ad_metrics` — metricas diarias por anuncio
- `agents` — agentes IA por empresa
- `agent_actions` — log de acoes dos agentes
- `agent_messages` — comunicacao entre agentes
- `agent_memories` — memoria coletiva (aprendizados)
- `automation_rules` — regras automaticas

## Objetivos do Meta Ads Cobertos
| Objetivo | Agente | KPIs |
|----------|--------|------|
| Leads WhatsApp | Agente de Leads | CPL, Taxa de Resposta |
| Vendas de Produtos | Agente de Vendas | ROAS, CPA, Ticket Medio |
| Trafego Direto | Agente de Trafego | CPC, CTR, Sessoes |
| Cadastros/Inscricoes | Agente de Cadastro | CPR, Taxa de Conversao |
| Instalacao de Apps | Agente de Apps | CPI, Instalacoes |
| Reconhecimento | Agente de Awareness | CPM, Alcance, Frequencia |
| Engajamento | Agente de Engajamento | CPE, Taxa de Engajamento |
| Funil Completo | Agente de Funil | ROAS Geral, CAC, LTV |

## Agentes Especialistas (14)
1. **Diretor (Orquestrador)** — coordena todos, distribui tarefas
2. **Agente de Leads** — leads qualificados WhatsApp
3. **Agente de Vendas** — vendas via catalogo/loja
4. **Agente de Trafego** — trafego qualificado
5. **Agente de Cadastro** — formularios e inscricoes
6. **Agente de Apps** — instalacao de aplicativos
7. **Agente de Awareness** — reconhecimento de marca
8. **Agente de Engajamento** — curtidas, comentarios, shares
9. **Agente de Funil** — estrategia TOFU/MOFU/BOFU
10. **Analista de Criativos** — A/B test, fadiga, formatos
11. **Analista de Publico** — segmentacao, lookalikes
12. **Gestor de Orcamento** — alocacao e otimizacao de verba
13. **Copywriter IA** — headlines, CTAs, angulos
14. **Analista de Dados** — dashboards, anomalias, tendencias

## Regras de Design
- Tailwind CSS para toda estilizacao
- Componentes em src/components/ e src/pages/
- Bordas: rounded-2xl, shadow-sm, border-gray-100
- Cores: blue-500/600 (primaria), purple-600 (secundaria), green-500 (positivo), red-500 (negativo)
- Cards com hover:shadow-md transition-shadow

## Regras de Seguranca
- NUNCA commitar .env
- .gitignore protege .env, .env.local
- RLS habilitado em todas as tabelas do Supabase
- Nunca expor tokens ou chaves no frontend
