# Meta D10 AI — Gestor de Trafego Inteligente

## Descricao
Plataforma completa de gestao de trafego pago com IA integrada. Foco em performance, ROI e automacao de campanhas.

## Stack
- React 19 + TypeScript
- Vite (bundler)
- Tailwind CSS v4 (estilizacao)
- Recharts (graficos)
- Lucide React (icones)
- React Router DOM (navegacao)

## Como rodar
```bash
npm install
npm run dev
```
Abre em http://localhost:5173

## Estrutura
```
src/
  App.tsx           — layout principal (sidebar + dashboard)
  components/
    Sidebar.tsx     — menu lateral com navegacao
    MetricCard.tsx  — cards de metricas (investido, leads, CTR, ROAS)
    CampaignTable.tsx — tabela de campanhas ativas
    PerformanceChart.tsx — grafico de investimento vs retorno
    AIInsights.tsx  — insights automaticos da IA
```

## Regras
- Sempre usar Tailwind pra estilizacao
- Componentes em src/components/
- Manter design consistente (rounded-2xl, shadow-sm, border-gray-100)
- Cores principais: blue-500/600 (primaria), purple-600 (secundaria), green-500 (positivo), red-500 (negativo)
