/**
 * Configuração do projeto Supabase.
 * Troque pelos dados do SEU projeto (Project Settings > API).
 * A "anon key" é pública por natureza — a segurança fica por conta das
 * políticas de RLS definidas em supabase/schema.sql.
 */
window.SUPABASE_CONFIG = {
  url: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'SUA-ANON-KEY-PUBLICA',
};

// Nome do bucket de armazenamento usado para logo e imagens.
window.SUPABASE_MEDIA_BUCKET = 'media';
