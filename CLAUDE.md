# UI_Pollinations

App desktop (Electron + React + TypeScript) para consumir a API gratuita do
Pollinations.ai: gerar imagens a partir de prompts, em loop percorrendo seeds,
salvar tudo em disco, preview em tempo real e sessões com histórico (evoluindo
até busca/tags/metadados).

## Stack
- Electron + TypeScript + React · tooling Electron Forge + Vite.
- Processo **main**: rede, disco, loop de geração, rate limiter.
- Processo **renderer**: UI React. Comunicação por **IPC tipado via preload**.
- Persistência: a definir na Fase 7 (SQLite vs JSON estruturado).

## Modo de trabalho (OBRIGATÓRIO)
- Idioma do projeto: **português**.
- Construção incremental: **uma fase por vez**. Executar UMA única fase e **parar**,
  aguardando confirmação clara do usuário antes de prosseguir/iniciar a próxima.
- **SEMPRE** quebrar cada fase em **subfases**.
- **SEMPRE** mostrar TODO o código de cada subfase **ANTES de aplicar**, explicá-lo
  e avaliar se está **claro, bonito e escalável**.
- **SEMPRE** aguardar confirmação clara antes de aplicar **QUALQUER** mudança
  (criar/editar arquivos, instalar dependências, rodar comandos que alterem algo).
- Nada é aplicado sem o "ok" explícito do usuário.

## Roadmap (fases)
0. Criar este CLAUDE.md
1. Prompt → imagem (MVP visual)
2. Salvar imagem + mapear a versão gratuita (script de sondagem + relatório)
3. Geração em loop (rate limiter, percorrer seeds)
4. Salvar todas as imagens do loop + preview em tempo real
5. Sessões (básico) — pasta por sessão, galeria por sessão
6. Metadados das imagens (seed, prompt, modelo, dimensões)
7. Persistência (decidir o banco)
8. Opções e qualidade de vida (anônimo / grátis / token)


## Padrões de código

O objetivo é **bater o olho e entender**. Regras:

### 1. Evite ternários na lógica das funções
Ternário é o `condição ? valorA : valorB`. Bom para um valor simples; ruim para lógica.
Prefira `if/else`, que se lê de cima para baixo.

```ts
// ❌ evite (ternário fazendo trabalho de lógica)
const badge = service.featured ? "Mais procurado" : service.isNew ? "Novo" : null;

// ✅ prefira
let badge = null;
if (service.featured) {
  badge = "Mais procurado";
} else if (service.isNew) {
  badge = "Novo";
}
```

### 2. Fuja de funções aninhadas (uma chamando a outra, chamando a outra...)
Evite a cadeia "função que chama função que chama função" dentro do mesmo arquivo. Isso
obriga a pular de um lado para o outro para entender. Prefira funções **achatadas**: cada uma
faz uma coisa, e quem coordena chama todas em sequência, de forma legível.

```ts
// ❌ evite (precisa caçar cada função para entender o fluxo)
function buildSeo() { return buildWithImage(); }
function buildWithImage() { return buildWithTitle(); }
function buildWithTitle() { /* ... */ }

// ✅ prefira (o fluxo está todo visível em um lugar)
function buildSeo(page) {
  const title = buildPageTitle(page);
  const image = pickOgImage(page);
  return buildOpenGraph(title, image);
}
```

### 3. Nomes extremamente auto-descritivos
O nome explica o que a coisa é/faz, sem precisar ler o resto.

## Commits & versionamento

- **Eu (Claude) faço um commit automático após cada mudança concluída.** Você não precisa
  pedir commit a cada vez — já faz parte do fluxo.
- **Cada commit captura todas as mudanças relacionadas.** Não deixar arquivos de fora: se a
  mudança mexe em código, dependências (`package.json`/lock) e docs, tudo entra no commit
  correspondente. Nunca fazer commit parcial que deixe o repositório num estado quebrado. Se
  houver mudanças pendentes **não** relacionadas, commitá-las à parte **antes**.
- **Os `push` são sempre seus, nunca meus.** Eu só faço commits locais.
- **Autoria**: todo commit tem **o Usuário como único autor** . **Nunca** adicionar o trailer `Co-Authored-By: Claude` nem
  qualquer menção ao Claude na mensagem.
- **Formato da mensagem**: prefixo convencional em inglês + **descrição em português-BR**.
  Os prefixos (chamados "Conventional Commits") são:

  | Prefixo | Quando usar |
  |---|---|
  | `feat` | Nova funcionalidade |
  | `fix` | Correção de bug |
  | `refactor` | Mudança interna sem alterar comportamento |
  | `style` | Só estilização/formatação (CSS, espaçamento), sem mexer na lógica |
  | `docs` | Documentação (ex.: este README.md, .env.example) |
  | `chore` | Tarefas de manutenção (configs, dependências) |
  | `test` | Testes |

  Exemplos:
  ```
  feat: adiciona tela de portifólio
  fix: corrige class-name de card do formulário
  refactor: separa a lógica do componente de produto em um hook
  style: aplica espaçamento e cores no card
  ```


## Preferências de desenvolvimento do Usuário

- **Mostrar o código e explicar ANTES de aplicar, como se estivesse explicando para um macaco, trazendo exemplos simples**, pedindo permissão a cada alteração.
- Quer explicações **em português (PT-BR)**, passo a passo / linha a linha.
- Gosta de **nomes amigáveis e intuitivos** para pastas, classes, ids e funções.
- Valoriza **elegância e o menor esforço** possível na solução.
- Responder **sempre em português**.
- Nome de variavel sempre em ingles.


## Regras de commit (importante)

- **Conventional Commits em português**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` etc.,
  com a descrição em português. Ex: `feat: adiciona filtro por modelo de trabalho`.
- **NUNCA** incluir atribuição do Claude nos commits (sem `Co-Authored-By`, sem "Generated with").
- **Commitar automaticamente** após cada conjunto de alterações concluído.
- **Só dar push quando o Usuário mandar explicitamente.**