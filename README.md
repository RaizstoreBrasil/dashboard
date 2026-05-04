# Fabrica de Agentes IA

Plataforma local para criar e administrar agentes de IA para atendimento, vendas e automacao de WhatsApp.

## O que tem

- Landing page premium em `/`
- Painel admin em `/admin` e `/dashboard`
- Header admin com busca, perfil, notificacoes e alternancia claro/escuro
- Criador inteligente de agentes
- Cadastro de empresas, prompts, conversas, clientes, planos, integracoes e configuracoes
- Backend FastAPI com SQLite
- Dados demo com `npm run seed`
- API tecnica em `/docs`

## Rodar com npm

Requisitos:

- Python instalado e funcionando com `python --version`
- Node/npm instalado para usar os comandos `npm`

PowerShell:

```powershell
cd C:\Users\Ancelmo\fabrica-agentes-ia
npm run setup
npm run seed
npm run dev
```

CMD:

```cmd
cd C:\Users\Ancelmo\fabrica-agentes-ia
npm run setup
npm run seed
npm run dev
```

Depois abra:

```text
http://localhost:8060/
http://localhost:8060/admin
http://localhost:8060/dashboard
http://localhost:8060/docs
```

## Scripts

```text
npm run setup   cria .venv e instala dependencias
npm run dev     roda com reload em http://localhost:8060
npm run start   roda em modo simples sem reload
npm run seed    cria dados de exemplo
npm run lint    valida sintaxe Python
npm run check   roda smoke test
npm run build   compila e roda teste
```

## Rodar sem npm

PowerShell:

```powershell
cd C:\Users\Ancelmo\fabrica-agentes-ia
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\seed.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1
```

CMD:

```cmd
cd C:\Users\Ancelmo\fabrica-agentes-ia
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\seed.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1
```

## Fluxo do dono da plataforma

1. Abra `/admin`
2. Cadastre uma empresa
3. Preencha o criador inteligente de agente
4. Clique em `Gerar agente com IA`
5. Copie prompt ou resumo para enviar ao cliente
6. Use a area de WhatsApp/teste para executar uma tarefa
7. Acompanhe conversas, clientes, planos e integracoes no painel

## Banco local

O SQLite local fica em:

```text
data/app.db
```

Tabelas preparadas:

```text
users
workspaces
companies
agents
prompts
conversations
customers
plans
integrations
settings
tools
agent_runs
messages
usage_events
```

## Configuracao manual que ainda falta

- Chave real da OpenAI em `.env`, se quiser trocar o placeholder por execucao real.
- Chave da Evolution API por agente no admin. O `.env` pode ter fallback global, mas cada agente pode usar sua propria chave.
- Definir auth real antes de publicar como SaaS.
- Migrar SQLite para Supabase/PostgreSQL quando for colocar em producao.

Exemplo `.env`:

```env
OPENAI_API_KEY=cole_sua_chave_nova_aqui
EVOLUTION_API_URL=https://evolutionapi.vps7829.panel.icontainer.cloud
EVOLUTION_API_KEY=opcional_fallback_global
```

Cada agente usa a propria instancia e pode ter a propria chave. No criador de agentes, preencha:

- `Nome da instancia`
- `URL Evolution API`
- `Chave da Evolution API do agente`

Depois, em cada agente:

1. Clique em `Criar instancia`
2. Clique em `Conectar QR`
3. Veja o QR/base64 na area de resultado
4. Clique em `Status` para atualizar conexao
5. Use `Enviar WhatsApp pela instancia` para teste

## Aparencia

A interface usa a paleta premium definida para dark/light mode:

- Dark: `#0F172A`, `#111827`, `#6366F1`, `#8B5CF6`, `#22D3EE`
- Light: `#F9FAFB`, `#FFFFFF`, `#111827`, `#6366F1`
- Gradiente principal: `linear-gradient(135deg, #6366F1, #8B5CF6, #22D3EE)`

## Validacao

```powershell
npm run check
```

Ou:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\smoke_test.py -o cache_dir=data/.pytest_cache
```

## Deploy

Este repo ficou preparado para publicar o `Raiz AI Dashboard` como site estatico.

- `index.html` na raiz e o ponto de entrada do Vercel
- `vercel.json` força o deploy estatico e redireciona tudo para `index.html`
- `.github/workflows/deploy-vercel.yml` faz deploy automatico quando os secrets do Vercel estiverem configurados no GitHub

Secrets esperados no GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
