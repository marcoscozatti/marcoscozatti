import { supabaseClient, publicMediaUrl } from './supabase-client.js';
import { t, pickLang } from './i18n.js';
import {
  escapeHtml, escapeAttr, renderMarkdown,
  loadSiteSettings, applySiteSettings, renderSocial, setupHeaderInteractions,
  detectInitialLang, buildLangSwitch, applyStaticI18n,
} from './layout.js';

const state = { lang: 'pt', settings: null, area: null };

function getSlug() {
  return new URLSearchParams(window.location.search).get('slug') || '';
}

async function loadArea(slug) {
  if (!supabaseClient || !slug) return null;
  try {
    const { data } = await supabaseClient.from('areas').select('*').eq('slug', slug).eq('active', true).maybeSingle();
    return data || null;
  } catch (err) {
    console.warn('[MarcosCozatti] falha ao buscar área:', err.message);
    return null;
  }
}

async function renderArea() {
  const area = state.area;
  const titleEl = document.getElementById('areaTitle');
  const subtitleEl = document.getElementById('areaSubtitle');
  const descEl = document.getElementById('areaDescription');
  const galleryEl = document.getElementById('areaGallery');
  const ctaEl = document.getElementById('areaCta');

  if (!area) {
    titleEl.textContent = t(state.lang, 'area_not_found');
    subtitleEl.textContent = '';
    descEl.innerHTML = '';
    galleryEl.innerHTML = '';
    ctaEl.innerHTML = '';
    return;
  }

  const title = pickLang(area, 'title', state.lang);
  const subtitle = pickLang(area, 'subtitle', state.lang);
  const descriptionMd = pickLang(area, 'description_md', state.lang);
  const ctaText = pickLang(area, 'cta_text', state.lang) || t(state.lang, 'area_cta_default');

  document.title = `${title} — Marcos Cozatti`;
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  descEl.innerHTML = await renderMarkdown(descriptionMd);

  galleryEl.innerHTML = '';
  const gallery = Array.isArray(area.gallery) ? area.gallery : [];
  gallery.forEach((item) => {
    const path = typeof item === 'string' ? item : item?.path;
    const url = publicMediaUrl(path);
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = escapeAttr(title);
    galleryEl.appendChild(img);
  });

  ctaEl.innerHTML = area.cta_link
    ? `<a href="${escapeAttr(area.cta_link)}" class="btn btn-accent">${escapeHtml(ctaText)}</a>`
    : '';
}

function setLang(lang) {
  state.lang = lang;
  applyStaticI18n(lang);
  buildLangSwitch(state.settings, state.lang, setLang);
  renderArea();
}

async function init() {
  const { settings, social } = await loadSiteSettings();
  state.settings = settings;
  state.area = await loadArea(getSlug());

  applySiteSettings(state.settings);
  renderSocial(social);
  setupHeaderInteractions();
  setLang(detectInitialLang(state.settings));
}

init();
