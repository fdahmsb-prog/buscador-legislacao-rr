# Buscador de Legislação Tributária – SEFAZ-RR (app web)

Aplicativo web instalável (PWA) com:

- **Legislação** – 51 normas resumidas (ICMS, ST, CONFAZ, Roraima, tributos federais, Reforma Tributária), busca por número, assunto ou trecho, e atalhos de pesquisa nas fontes oficiais.
- **Tabelas e códigos** – CFOP, CST/CSOSN, CEST, NCM/TIPI, CST IPI e PIS/Cofins, CST IBS/CBS, cClassTrib, NBS, LC 116 e campos da NF-e/EFD.
- **Ferramentas do auditor** – ICMS-ST/MVA ajustada, DIFAL, alíquota interestadual, chave de acesso, CNPJ/CPF, decadência, cálculo “por dentro”, consulta de atos do CONFAZ.
- **Guia de referência** e **Fontes oficiais** (federal, CONFAZ, Roraima, Boa Vista, 27 SEFAZ).

Funciona **offline** depois do primeiro acesso e pode ser **instalado** no celular ou no computador.
Com o banco compartilhado (Supabase) configurado, auditores autorizados entram com o e-mail e podem **incluir normas, anexar PDFs e alterar links** direto no app — as mudanças aparecem para toda a equipe. Os recursos de IA existem apenas na versão do Claude.

Configuração do banco: veja `supabase/setup.sql` e o arquivo `config.js` (passo a passo no guia de instalação).

---

## 1. Publicar (uma vez)

1. **GitHub** – crie um repositório (ex.: `buscador-legislacao-rr`) e envie todos os arquivos desta pasta,
   inclusive a pasta oculta `.github/` (arraste a pasta inteira em *Add file → Upload files*, ou use `git push`).
2. **Vercel** – *Add New → Project → Import* o repositório.
   *Framework Preset*: **Other** · *Build Command*: vazio · *Output Directory*: vazio (raiz). Clique em **Deploy**.
3. Copie o endereço gerado (ex.: `https://buscador-legislacao-rr.vercel.app`) e envie aos auditores.

> Opcional: em *Settings → Deployment Protection* do Vercel é possível exigir senha/login (planos pagos).
> O conteúdo é legislação pública e não contém dados de contribuintes.

## 2. Instalar (cada auditor)

- **Android / Chrome / Edge**: abrir o link → botão **⬇ Instalar app** no topo (ou menu ⋮ → *Instalar app*).
- **iPhone (Safari)**: Compartilhar → **Adicionar à Tela de Início**.
- **Windows**: no Edge/Chrome, ícone de instalar na barra de endereço.

## 3. Manter atualizado

| O quê | Como |
|---|---|
| **Tabelas fiscais** (CFOP, CEST, NCM, cClassTrib…) | Automático: a Action `.github/workflows/atualizar-tabelas.yml` roda todo dia 1º, valida e publica. Para rodar na hora: aba **Actions → Atualizar tabelas fiscais → Run workflow**. Em *Settings → Actions → General*, deixe “Read and write permissions”. |
| **Normas cadastradas pela equipe** (inclusive as importadas de PDF) | No buscador do Claude, clique em **“Exportar normas da equipe para o app web”** (barra de filtros). Cole o conteúdo em `data/normas_equipe.json` no GitHub e salve (commit). Vão junto o link de origem do PDF e o texto indexado; a cópia do PDF fica só no Claude. |
| **Links alterados e PDFs anexados às normas da base** | No Claude, clique em **“Exportar links e PDFs alterados para o app web”** e cole em `data/ajustes_normas.json` no GitHub. |
| **Base de normas, páginas e ferramentas** | Peça a atualização ao Claude, substitua os arquivos alterados no GitHub e aumente o valor de `VERSAO` em `sw.js` (ex.: `2026-12-01-1`) para que os apps instalados recebam o aviso “Nova versão disponível”. |

Cada commit no GitHub publica automaticamente no Vercel.

## Estrutura

```
index.html            página principal
app2.js … app5.js     módulos (tabelas, ferramentas, normas da equipe, fontes oficiais, CONFAZ)
pwa.js / sw.js        instalação e funcionamento offline
manifest.webmanifest  dados do app instalável
data/                 tabelas.json, ncm.json, meta.json, normas_equipe.json
tools/build_data.py   gerador das tabelas (usado pela Action)
```

Fontes das tabelas: OCA l10n-brazil (`l10n_br_fiscal/data`) e tabela CEST do CONFAZ. Os resumos são interpretativos
e não substituem o texto oficial.
