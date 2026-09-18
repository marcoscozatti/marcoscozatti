import { supabaseClient } from './supabase-client.js';
import { pickLang } from './i18n.js';
import {
  escapeHtml, escapeAttr,
  loadSiteSettings, applySiteSettings, renderSocial, setupHeaderInteractions,
  detectInitialLang, buildLangSwitch, applyStaticI18n,
} from './layout.js';

const state = { lang: 'pt', settings: null, videos: [] };

async function loadVideos() {
  if (!supabaseClient) return [];
  try {
    const { data } = await supabaseClient.from('videos').select('*').eq('active', true).order('order_index');
    return data || [];
  } catch (err) {
    console.warn('[MarcosCozatti] falha ao buscar vídeos:', err.message);
    return [];
  }
}

function renderVideos() {
  const grid = document.getElementById('videoGrid');
  const empty = document.getElementById('videosEmpty');
  grid.innerHTML = '';

  if (!state.videos.length) {
    empty.hidden = false;
    empty.textContent = 'Nenhum vídeo cadastrado ainda — adicione pelo painel /admin.';
    return;
  }
  empty.hidden = true;

  state.videos.forEach((video) => {
    const title = pickLang(video, 'title', state.lang);
    const description = pickLang(video, 'description', state.lang);
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-frame">
        <iframe src="https://www.youtube-nocookie.com/embed/${escapeAttr(video.youtube_id)}" title="${escapeAttr(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <div class="video-info">
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}

function setLang(lang) {
  state.lang = lang;
  applyStaticI18n(lang);
  buildLangSwitch(state.settings, state.lang, setLang);
  renderVideos();
}

async function init() {
  const { settings, social } = await loadSiteSettings();
  state.settings = settings;
  state.videos = await loadVideos();

  applySiteSettings(state.settings);
  renderSocial(social);
  setupHeaderInteractions();
  setLang(detectInitialLang(state.settings));
}

init();
