import { supabaseClient, publicMediaUrl } from './supabase-client.js';
import { t, pickLang } from './i18n.js';
import {
  escapeHtml, escapeAttr,
  loadSiteSettings, applySiteSettings, renderSocial, setupHeaderInteractions,
  detectInitialLang, buildLangSwitch, applyStaticI18n,
} from './layout.js';

const state = { lang: 'pt', settings: null, posts: [] };

async function loadPosts() {
  if (!supabaseClient) return [];
  try {
    const { data } = await supabaseClient.from('blog_posts').select('*').eq('active', true).order('published_at', { ascending: false });
    return data || [];
  } catch (err) {
    console.warn('[MarcosCozatti] falha ao buscar posts:', err.message);
    return [];
  }
}

function formatDate(iso, lang) {
  if (!iso) return '';
  const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderPosts() {
  const grid = document.getElementById('blogGrid');
  const empty = document.getElementById('blogEmpty');
  grid.innerHTML = '';

  if (!state.posts.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  state.posts.forEach((post) => {
    const img = publicMediaUrl(post.cover_image);
    const title = pickLang(post, 'title', state.lang);
    const excerpt = pickLang(post, 'excerpt', state.lang);

    const card = document.createElement('a');
    card.className = 'blog-card';
    card.href = `post.html?slug=${encodeURIComponent(post.slug)}`;
    card.innerHTML = `
      <div class="blog-cover">${img ? `<img src="${img}" alt="${escapeAttr(title)}" />` : ''}</div>
      <div class="blog-card-body">
        <span class="blog-date">${escapeHtml(formatDate(post.published_at, state.lang))}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(excerpt)}</p>
        <span class="blog-read-more">${escapeHtml(t(state.lang, 'blog_read_more'))} →</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function setLang(lang) {
  state.lang = lang;
  applyStaticI18n(lang);
  buildLangSwitch(state.settings, state.lang, setLang);
  renderPosts();
}

async function init() {
  const { settings, social } = await loadSiteSettings();
  state.settings = settings;
  state.posts = await loadPosts();

  applySiteSettings(state.settings);
  renderSocial(social);
  setupHeaderInteractions();
  setLang(detectInitialLang(state.settings));
}

init();
