/**
 * Cliente Supabase compartilhado entre o site público e o painel admin.
 * Carregado como <script type="module">, exporta `supabaseClient` e
 * `isSupabaseConfigured` para quem precisar checar se as chaves reais
 * já foram preenchidas em js/config.js.
 */
const config = window.SUPABASE_CONFIG || {};

export const isSupabaseConfigured =
  !!config.url &&
  !!config.anonKey &&
  !config.url.includes('SEU-PROJETO') &&
  !config.anonKey.includes('SUA-ANON-KEY');

// Import dinâmico (em vez de estático) para que uma falha ao carregar o
// CDN (rede restrita, CDN fora do ar) não derrube o site inteiro — nesse
// caso o site cai graciosamente para o conteúdo de demonstração.
let createClient = null;
if (isSupabaseConfigured) {
  try {
    ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'));
  } catch (err) {
    console.warn('[MarcosCozatti] Não foi possível carregar o SDK do Supabase (CDN indisponível).', err);
  }
}

export const supabaseClient = createClient
  ? createClient(config.url, config.anonKey)
  : null;

export const MEDIA_BUCKET = window.SUPABASE_MEDIA_BUCKET || 'media';

export function publicMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (!supabaseClient) return null;
  const { data } = supabaseClient.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
