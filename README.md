# Marcos Cozatti — Site com Painel Administrativo

Site pessoal (professor, fotografia e drones) com área gerencial completa,
para você mesmo editar textos, imagens, cores, fontes e idiomas sem depender
de um desenvolvedor. Construído em **HTML, CSS e JavaScript puro** (sem
build step), usando **Supabase** como banco de dados, autenticação e
armazenamento de imagens.

## Estrutura do projeto

```
/index.html               → home
/area.html                → template das áreas (Serviços, Fotografia, Drones...) — /area.html?slug=X
/videos.html               → destaques do canal do YouTube
/blog.html                 → listagem de posts
/post.html                 → post individual — /post.html?slug=X
/css/styles.css            → estilos do site público

/js/config.js              → credenciais do Supabase (EDITAR)
/js/supabase-client.js     → cliente Supabase compartilhado
/js/i18n.js                → textos fixos da interface (PT/EN/ES)
/js/layout.js              → lógica compartilhada entre páginas (header, footer, idioma, markdown)
/js/main.js                → lógica da home
/js/area.js                → lógica da página de área
/js/videos.js               → lógica da página de vídeos
/js/blog.js                → lógica da listagem do blog
/js/post.js                → lógica do post individual

/admin/index.html          → painel administrativo
/admin/css/admin.css       → estilos do painel
/admin/js/admin.js         → lógica do painel (login, CRUD, upload, tradução)

/supabase/schema.sql                          → script de criação do banco
/supabase/functions/send-contact-email/       → função opcional de e-mail

netlify.toml               → configuração de deploy no Netlify (inclui URLs amigáveis)
```

## 1. Criar o projeto no Supabase

1. Crie uma conta e um novo projeto em https://supabase.com.
2. Vá em **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e
   execute. Isso cria as tabelas, políticas de segurança (RLS), o bucket
   de armazenamento `media` e já cadastra o link do seu canal do YouTube.
3. Vá em **Authentication → Users** e crie um usuário (e-mail + senha) —
   será o seu login no painel `/admin`.
4. Copie o **UUID** desse usuário (aparece na lista de usuários) e volte
   ao SQL Editor para rodar:
   ```sql
   insert into public.admins (user_id, name) values ('COLE-O-UUID-AQUI', 'Marcos');
   ```
   Sem essa linha, o login funciona mas o painel nega acesso (é assim que
   controlamos quem pode editar o site).

## 2. Conectar o site ao seu projeto

Abra `js/config.js` e substitua pelos dados do seu projeto (em
**Project Settings → API**):

```js
window.SUPABASE_CONFIG = {
  url: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'SUA-ANON-KEY-PUBLICA',
};
```

A `anon key` é pública por natureza (é assim que o Supabase funciona) — a
segurança real está nas políticas de RLS já criadas pelo `schema.sql`:
qualquer visitante só consegue *ler* conteúdo ativo e *enviar* mensagens de
contato; apenas usuários cadastrados em `admins` conseguem editar.

## 3. Rodar localmente

Como é um site 100% estático, basta servir a pasta com qualquer servidor
HTTP simples:

```bash
python3 -m http.server 8080
# depois acesse http://localhost:8080 e http://localhost:8080/admin/
```

Sem o Supabase configurado, o site público exibe automaticamente um
conteúdo de demonstração (para você visualizar o layout), e o painel admin
mostra um aviso pedindo para configurar `js/config.js`.

## 4. Publicar no Netlify

1. Suba este repositório para o GitHub.
2. No Netlify: **Add new site → Import an existing project**.
3. Build command: (nenhum) — Publish directory: `.`
4. Deploy. O `netlify.toml` já cuida do resto, incluindo URLs amigáveis como
   `/fotografia`, `/drones`, `/blog` e `/blog/nome-do-post`.
5. Em **Domain settings**, adicione seu domínio `marcoscozatti.pro.br`
   (já registrado) e aponte o DNS conforme instruções do próprio Netlify.
   O HTTPS é configurado automaticamente e sem custo.

## 5. Usando o painel administrativo (`/admin`)

- **Mensagens**: veja quem preencheu o formulário de contato do site.
- **Configurações**: nome exibido, logo, favicon, fontes, cor de destaque,
  intervalo dos slides, idiomas habilitados (PT sempre ativo; EN/ES
  opcionais), telefone, WhatsApp, e-mail e endereço.
- **Slides (Topo)**: quantos slides quiser no topo da home.
- **Áreas**: cada área (ex: Serviços, Fotografia, Drones) vira um card na
  home e uma página própria em `/area.html?slug=SEU-SLUG` (com URL
  amigável tipo `/fotografia` já configurada). Pode ter descrição longa em
  Markdown e uma galeria de fotos.
- **Vídeos**: destaques do seu canal do YouTube — só colar o ID do vídeo.
- **Sobre / Linha do tempo**: marcos da sua trajetória.
- **Depoimentos**: depoimentos de alunos e clientes.
- **Blog**: posts com capa, resumo e conteúdo completo em Markdown.
- **Redes Sociais**: ícones exibidos no rodapé/contato (o YouTube já vem
  pré-cadastrado com `youtube.com/@marcoscozatti`).

### Tradução automática (PT → EN/ES)

Em qualquer campo de texto, ao habilitar inglês e/ou espanhol nas
Configurações, aparece um botão **"↻ Traduzir PT para EN/ES"**. Ele usa a
API gratuita [MyMemory](https://mymemory.translated.net/) para preencher
automaticamente os campos — sempre revisáveis manualmente antes de salvar.

## 6. E-mail do formulário de contato (opcional)

Toda mensagem enviada pelo formulário já fica salva no banco e aparece em
**Mensagens** no painel — isso funciona imediatamente, sem configuração
extra.

Para também receber um **e-mail automático** a cada novo contato:

1. Crie uma conta gratuita em https://resend.com e gere uma API key.
2. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) e rode,
   na raiz do projeto:
   ```bash
   supabase login
   supabase link --project-ref SEU-PROJECT-REF
   supabase functions deploy send-contact-email
   supabase secrets set RESEND_API_KEY=sua_chave_da_resend
   ```
3. Pronto — o site já chama essa função automaticamente a cada envio do
   formulário, mandando o e-mail para o endereço definido em
   **Configurações → E-mail que recebe as mensagens do formulário**.
