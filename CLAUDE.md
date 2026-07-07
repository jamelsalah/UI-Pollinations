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
