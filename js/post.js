import { supabaseClient, publicMediaUrl } from './supabase-client.js';
import { pickLang } from './i18n.js';
import {
  escapeHtml, escapeAttr, renderMarkdown,
  loadSiteSettings, applySiteSettings, renderSocial, setupHeaderInteractions,
  detectInitialLang, buildLangSwitch, applyStaticI18n,
} from './layout.js';

const state = { lang: 'pt', settings: null, post: null };

function getSlug() {
  return new URLSearchParams(window.location.search).get('slug') || '';
}

async function loadPost(slug) {
  if (!supabaseClient || !slug) return null;
  try {
    const { data } = await supabaseClient.from('blog_posts').select('*').eq('slug', slug).eq('active', true).maybeSingle();
    return data || null;
  } catch (err) {
    console.warn('[MarcosCozatti] falha ao buscar post:', err.message);
    return null;
  }
}

function formatDate(iso, lang) {
  if (!iso) return '';
  const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

async function renderPost() {
  const post = state.post;
  const titleEl = document.getElementById('postTitle');
  const metaEl = document.getElementById('postMeta');
  const bodyEl = document.getElementById('postBody');
  const coverWrap = document.getElementById('postCoverWrap');
  const coverImg = document.getElementById('postCoverImg');

  if (!post) {
    titleEl.textContent = 'Post não encontrado';
    metaEl.textContent = '';
    bodyEl.innerHTML = '';
    coverWrap.hidden = true;
    return;
  }

  const title = pickLang(post, 'title', state.lang);
  const contentMd = pickLang(post, 'content_md', state.lang);

  document.title = `${title} — Marcos Cozatti`;
  titleEl.textContent = title;
  metaEl.textContent = formatDate(post.published_at, state.lang);
  bodyEl.innerHTML = await renderMarkdown(contentMd);

  const coverUrl = publicMediaUrl(post.cover_image);
  if (coverUrl) {
    coverImg.src = coverUrl;
    coverImg.alt = escapeAttr(title);
    coverWrap.hidden = false;
  } else {
    coverWrap.hidden = true;
  }
}

function setLang(lang) {
  state.lang = lang;
  applyStaticI18n(lang);
  buildLangSwitch(state.settings, state.lang, setLang);
  renderPost();
}

async function init() {
  const { settings, social } = await loadSiteSettings();
  state.settings = settings;
  state.post = await loadPost(getSlug());

  applySiteSettings(state.settings);
  renderSocial(social);
  setupHeaderInteractions();
  setLang(detectInitialLang(state.settings));
}

init();
