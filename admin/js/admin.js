import { supabaseClient, isSupabaseConfigured, publicMediaUrl, MEDIA_BUCKET } from '../../js/supabase-client.js';

/* =========================================================================
   Estado
   ========================================================================= */
const state = {
  settings: null,
  slides: [],
  areas: [],
  videos: [],
  timeline: [],
  testimonials: [],
  posts: [],
  social: [],
  messages: [],
  activeMessageId: null,
};

const ICON_OPTIONS = ['star', 'briefcase', 'camera', 'drone', 'play', 'book', 'target', 'chart', 'users', 'globe', 'heart'];
const SOCIAL_PLATFORMS = ['youtube', 'instagram', 'facebook', 'linkedin', 'whatsapp', 'tiktok', 'twitter', 'link'];

/* =========================================================================
   Utils
   ========================================================================= */
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(str) {
  return esc(str).replace(/"/g, '&quot;');
}

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = isError ? '#7a2b21' : '#16223b';
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function enabledLangs() {
  const langs = state.settings?.enabled_languages;
  return Array.isArray(langs) && langs.length ? langs : ['pt'];
}

async function uploadImage(file, folder) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseClient.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

async function translateText(text, targetLang) {
  if (!text || !text.trim()) return '';
  const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|${targetLang}`);
  const data = await res.json();
  return data?.responseData?.translatedText || '';
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Aceita um ID puro ou um link completo do YouTube (watch, youtu.be, embed,
 * shorts — com ou sem parâmetros extras como &t=25s) e devolve só o ID. */
function extractYoutubeId(input) {
  const value = String(input || '').trim();
  if (!value) return '';

  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }
    if (url.searchParams.get('v')) {
      return url.searchParams.get('v');
    }
    const pathMatch = url.pathname.match(/\/(?:embed|shorts)\/([^/?&]+)/);
    if (pathMatch) return pathMatch[1];
  } catch (e) {
    // não é uma URL válida — trata como ID puro (ou ID com lixo colado junto)
  }

  return value.split(/[&?#]/)[0];
}

/* =========================================================================
   Autenticação
   ========================================================================= */
async function checkAdmin(userId) {
  const { data } = await supabaseClient.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

async function initAuth() {
  if (!isSupabaseConfigured || !supabaseClient) {
    document.getElementById('configWarning').hidden = false;
    document.getElementById('loginBtn').disabled = true;
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user && (await checkAdmin(session.user.id))) {
    showApp();
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const ok = await checkAdmin(data.user.id);
      if (!ok) {
        await supabaseClient.auth.signOut();
        throw new Error('Este usuário não tem permissão de administrador.');
      }
      showApp();
    } catch (err) {
      errorEl.textContent = err.message || 'Não foi possível entrar.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
  });
}

async function showApp() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('appShell').hidden = false;
  setupNav();
  setupModal();
  await loadEverything();
  setupSettingsForm();
  setupAddButtons();
}

/* =========================================================================
   Navegação lateral
   ========================================================================= */
function setupNav() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('is-active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById(`panel-${btn.dataset.section}`).classList.add('is-active');
    });
  });
}

/* =========================================================================
   Carregamento geral
   ========================================================================= */
async function loadEverything() {
  const [settingsRes, slidesRes, areasRes, videosRes, timelineRes, testimonialsRes, postsRes, socialRes, messagesRes] = await Promise.all([
    supabaseClient.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    supabaseClient.from('hero_slides').select('*').order('order_index'),
    supabaseClient.from('areas').select('*').order('order_index'),
    supabaseClient.from('videos').select('*').order('order_index'),
    supabaseClient.from('timeline_items').select('*').order('order_index'),
    supabaseClient.from('testimonials').select('*').order('order_index'),
    supabaseClient.from('blog_posts').select('*').order('published_at', { ascending: false }),
    supabaseClient.from('social_links').select('*').order('order_index'),
    supabaseClient.from('contact_messages').select('*').order('created_at', { ascending: false }),
  ]);

  state.settings = settingsRes.data;
  state.slides = slidesRes.data || [];
  state.areas = areasRes.data || [];
  state.videos = videosRes.data || [];
  state.timeline = timelineRes.data || [];
  state.testimonials = testimonialsRes.data || [];
  state.posts = postsRes.data || [];
  state.social = socialRes.data || [];
  state.messages = messagesRes.data || [];

  fillSettingsForm();
  renderSlides();
  renderAreas();
  renderVideos();
  renderTimeline();
  renderTestimonials();
  renderPosts();
  renderSocial();
  renderMessages();
}

/* =========================================================================
   Configurações
   ========================================================================= */
function fillSettingsForm() {
  const s = state.settings || {};
  document.getElementById('s_company_name').value = s.company_name || '';
  document.getElementById('s_font_family').value = s.font_family || 'Inter';
  document.getElementById('s_heading_font_family').value = s.heading_font_family || 'Playfair Display';
  document.getElementById('s_font_size_base').value = s.font_size_base || 16;
  document.getElementById('s_accent_color').value = s.accent_color || '#1F9E8B';
  document.getElementById('s_slide_interval').value = (s.slide_interval_ms || 5000) / 1000;
  document.getElementById('s_default_lang').value = s.default_lang || 'pt';
  document.getElementById('s_contact_recipient_email').value = s.contact_recipient_email || '';
  document.getElementById('s_phone').value = s.phone || '';
  document.getElementById('s_whatsapp').value = s.whatsapp || '';
  document.getElementById('s_footer_email').value = s.footer_email || '';
  document.getElementById('s_address').value = s.address || '';

  const langs = s.enabled_languages || ['pt'];
  document.getElementById('s_lang_en').checked = langs.includes('en');
  document.getElementById('s_lang_es').checked = langs.includes('es');

  setPreview('s_logo_preview', s.logo_url);
  setPreview('s_favicon_preview', s.favicon_url);

  document.getElementById('s_logo_file').dataset.currentPath = s.logo_url || '';
  document.getElementById('s_favicon_file').dataset.currentPath = s.favicon_url || '';
}

function setPreview(imgId, path) {
  const img = document.getElementById(imgId);
  const url = publicMediaUrl(path);
  if (url) { img.src = url; img.hidden = false; } else { img.hidden = true; }
}

function setupSettingsForm() {
  document.getElementById('s_logo_file').addEventListener('change', (e) => handleSettingsUpload(e, 's_logo_file', 's_logo_preview', 'branding'));
  document.getElementById('s_favicon_file').addEventListener('change', (e) => handleSettingsUpload(e, 's_favicon_file', 's_favicon_preview', 'branding'));

  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('settingsStatus');
    status.textContent = 'Salvando...';
    status.className = 'save-status';

    const langs = ['pt'];
    if (document.getElementById('s_lang_en').checked) langs.push('en');
    if (document.getElementById('s_lang_es').checked) langs.push('es');

    const payload = {
      company_name: document.getElementById('s_company_name').value.trim(),
      font_family: document.getElementById('s_font_family').value,
      heading_font_family: document.getElementById('s_heading_font_family').value,
      font_size_base: Number(document.getElementById('s_font_size_base').value) || 16,
      accent_color: document.getElementById('s_accent_color').value,
      slide_interval_ms: Math.round(Number(document.getElementById('s_slide_interval').value || 5) * 1000),
      default_lang: document.getElementById('s_default_lang').value,
      enabled_languages: langs,
      contact_recipient_email: document.getElementById('s_contact_recipient_email').value.trim() || null,
      phone: document.getElementById('s_phone').value.trim() || null,
      whatsapp: document.getElementById('s_whatsapp').value.trim() || null,
      footer_email: document.getElementById('s_footer_email').value.trim() || null,
      address: document.getElementById('s_address').value.trim() || null,
      logo_url: document.getElementById('s_logo_file').dataset.currentPath || null,
      favicon_url: document.getElementById('s_favicon_file').dataset.currentPath || null,
    };

    try {
      const { data, error } = await supabaseClient.from('site_settings').update(payload).eq('id', 1).select().maybeSingle();
      if (error) throw error;
      state.settings = data;
      status.textContent = 'Configurações salvas com sucesso.';
      status.classList.add('success');
      toast('Configurações salvas');
    } catch (err) {
      status.textContent = 'Erro ao salvar: ' + err.message;
      status.classList.add('error');
    }
  });
}

async function handleSettingsUpload(e, fileInputId, previewId, folder) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const path = await uploadImage(file, folder);
    document.getElementById(fileInputId).dataset.currentPath = path;
    setPreview(previewId, path);
    toast('Imagem enviada. Não esqueça de salvar.');
  } catch (err) {
    toast('Erro ao enviar imagem: ' + err.message, true);
  }
}

/* =========================================================================
   Componentes de formulário multilíngue (usados no modal)
   ========================================================================= */
function langGroup(prefix, label, type, row, rows = 3) {
  const langs = enabledLangs();
  const otherLangs = langs.filter((l) => l !== 'pt');
  const rowsData = { pt: row?.[`${prefix}_pt`] || '' };
  otherLangs.forEach((l) => { rowsData[l] = row?.[`${prefix}_${l}`] || ''; });

  const fieldHtml = (lang) => type === 'textarea'
    ? `<textarea data-lang="${lang}" rows="${rows}">${esc(rowsData[lang])}</textarea>`
    : `<input type="text" data-lang="${lang}" value="${escAttr(rowsData[lang])}" />`;

  return `
    <div class="lang-field-group" data-prefix="${prefix}">
      <label class="group-label">${label}</label>
      <div class="lang-input"><span class="lang-tag">PORTUGUÊS</span>${fieldHtml('pt')}</div>
      ${otherLangs.map((l) => `<div class="lang-input"><span class="lang-tag">${l.toUpperCase()}</span>${fieldHtml(l)}</div>`).join('')}
      ${otherLangs.length ? `<button type="button" class="translate-btn" data-translate-prefix="${prefix}">↻ Traduzir PT para ${otherLangs.map((l) => l.toUpperCase()).join('/')}</button>` : ''}
    </div>
  `;
}

function collectLangGroup(container, prefix) {
  const group = container.querySelector(`.lang-field-group[data-prefix="${prefix}"]`);
  const result = {};
  group.querySelectorAll('[data-lang]').forEach((el) => {
    result[`${prefix}_${el.dataset.lang}`] = el.value.trim() || null;
  });
  return result;
}

function wireTranslateButtons(container) {
  container.querySelectorAll('[data-translate-prefix]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const prefix = btn.dataset.translatePrefix;
      const group = container.querySelector(`.lang-field-group[data-prefix="${prefix}"]`);
      const ptField = group.querySelector('[data-lang="pt"]');
      const ptText = ptField.value.trim();
      if (!ptText) { toast('Escreva o texto em português primeiro.', true); return; }

      btn.disabled = true;
      btn.textContent = 'Traduzindo...';
      try {
        const targets = [...group.querySelectorAll('[data-lang]')].filter((el) => el.dataset.lang !== 'pt');
        for (const el of targets) {
          el.value = await translateText(ptText, el.dataset.lang);
        }
        toast('Tradução automática aplicada — revise antes de salvar.');
      } catch (err) {
        toast('Não foi possível traduzir agora. Preencha manualmente.', true);
      } finally {
        btn.disabled = false;
        btn.textContent = `↻ Traduzir PT para ${[...group.querySelectorAll('[data-lang]')].filter((el) => el.dataset.lang !== 'pt').map((el) => el.dataset.lang.toUpperCase()).join('/')}`;
      }
    });
  });
}

function imageField(fieldId, label, currentPath) {
  const url = publicMediaUrl(currentPath);
  return `
    <div class="field full">
      <label>${label}</label>
      <div class="upload-row">
        <img class="upload-preview" id="${fieldId}_preview" src="${url || ''}" ${url ? '' : 'hidden'} />
        <input type="file" id="${fieldId}_file" accept="image/*" />
      </div>
      <input type="hidden" id="${fieldId}_value" value="${escAttr(currentPath || '')}" />
    </div>
  `;
}

function wireImageField(container, fieldId, folder) {
  const fileInput = container.querySelector(`#${fieldId}_file`);
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const path = await uploadImage(file, folder);
      container.querySelector(`#${fieldId}_value`).value = path;
      const preview = container.querySelector(`#${fieldId}_preview`);
      preview.src = publicMediaUrl(path);
      preview.hidden = false;
      toast('Imagem enviada.');
    } catch (err) {
      toast('Erro ao enviar imagem: ' + err.message, true);
    }
  });
}

/* =========================================================================
   Modal genérico
   ========================================================================= */
function setupModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
}

function openModal(title, bodyHtml, onMount) {
  document.getElementById('modalTitle').textContent = title;
  const body = document.getElementById('modalBody');
  body.innerHTML = bodyHtml;
  document.getElementById('modalOverlay').hidden = false;
  wireTranslateButtons(body);
  if (onMount) onMount(body);
}

function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
  document.getElementById('modalBody').innerHTML = '';
}

async function confirmDelete(message) {
  return window.confirm(message);
}

/* =========================================================================
   Listas genéricas (thumb + reorder + editar/excluir)
   ========================================================================= */
function renderItemList(containerId, items, { thumbPath, titleFn, subtitleFn, onEdit, onDelete, onReorder, onToggleActive }) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">Nenhum item cadastrado ainda.</p>';
    return;
  }

  items.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'item-card';
    const thumbSrc = publicMediaUrl(thumbPath(item));

    el.innerHTML = `
      ${thumbSrc
        ? `<img class="item-thumb" src="${thumbSrc}" alt="" />`
        : `<div class="item-thumb placeholder">✦</div>`}
      <div class="item-info">
        <strong>${esc(titleFn(item))}</strong>
        <span>${esc(subtitleFn(item))}</span>
      </div>
      <span class="status-badge ${item.active ? '' : 'inactive'}" data-role="toggle">${item.active ? 'Ativo' : 'Inativo'}</span>
      <div class="item-actions">
        <button class="icon-btn" data-role="up" ${index === 0 ? 'disabled' : ''} title="Mover para cima">↑</button>
        <button class="icon-btn" data-role="down" ${index === items.length - 1 ? 'disabled' : ''} title="Mover para baixo">↓</button>
        <button class="icon-btn" data-role="edit" title="Editar">✎</button>
        <button class="icon-btn danger" data-role="delete" title="Excluir">🗑</button>
      </div>
    `;

    el.querySelector('[data-role="edit"]').addEventListener('click', () => onEdit(item));
    el.querySelector('[data-role="delete"]').addEventListener('click', async () => {
      if (await confirmDelete('Excluir este item? Essa ação não pode ser desfeita.')) onDelete(item);
    });
    el.querySelector('[data-role="up"]').addEventListener('click', () => onReorder(item, items[index - 1]));
    el.querySelector('[data-role="down"]').addEventListener('click', () => onReorder(item, items[index + 1]));
    el.querySelector('[data-role="toggle"]').addEventListener('click', () => onToggleActive(item));

    container.appendChild(el);
  });
}

async function swapOrder(table, itemA, itemB) {
  if (!itemB) return;
  await Promise.all([
    supabaseClient.from(table).update({ order_index: itemB.order_index }).eq('id', itemA.id),
    supabaseClient.from(table).update({ order_index: itemA.order_index }).eq('id', itemB.id),
  ]);
}

/* =========================================================================
   SLIDES
   ========================================================================= */
function renderSlides() {
  renderItemList('slidesList', state.slides, {
    thumbPath: (s) => s.image_url,
    titleFn: (s) => s.title_pt || '(sem título)',
    subtitleFn: (s) => s.subtitle_pt || '',
    onEdit: openSlideModal,
    onDelete: async (s) => { await supabaseClient.from('hero_slides').delete().eq('id', s.id); await reloadSlides(); toast('Slide excluído'); },
    onReorder: async (a, b) => { await swapOrder('hero_slides', a, b); await reloadSlides(); },
    onToggleActive: async (s) => { await supabaseClient.from('hero_slides').update({ active: !s.active }).eq('id', s.id); await reloadSlides(); },
  });
}

async function reloadSlides() {
  const { data } = await supabaseClient.from('hero_slides').select('*').order('order_index');
  state.slides = data || [];
  renderSlides();
}

function openSlideModal(slide) {
  const isNew = !slide;
  const row = slide || {};
  const bodyHtml = `
    <form id="slideForm">
      ${imageField('slide_image', 'Imagem do slide', row.image_url)}
      ${langGroup('title', 'Título', 'input', row)}
      ${langGroup('subtitle', 'Subtítulo', 'textarea', row)}
      ${langGroup('cta_text', 'Texto do botão', 'input', row)}
      <div class="field full">
        <label>Link do botão (opcional)</label>
        <input type="text" id="slide_cta_link" value="${escAttr(row.cta_link || '#contact')}" />
      </div>
      <div class="field full">
        <label><input type="checkbox" id="slide_active" ${row.active !== false ? 'checked' : ''} /> Slide ativo (visível no site)</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar slide' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Novo slide' : 'Editar slide', bodyHtml, (body) => {
    wireImageField(body, 'slide_image', 'slides');
    body.querySelector('#slideForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        ...collectLangGroup(body, 'title'),
        ...collectLangGroup(body, 'subtitle'),
        ...collectLangGroup(body, 'cta_text'),
        cta_link: body.querySelector('#slide_cta_link').value.trim() || null,
        image_url: body.querySelector('#slide_image_value').value || null,
        active: body.querySelector('#slide_active').checked,
      };

      try {
        if (isNew) {
          payload.order_index = state.slides.length;
          const { error } = await supabaseClient.from('hero_slides').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('hero_slides').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadSlides();
        toast('Slide salvo com sucesso');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   ÁREAS (Serviços / Fotografia / Drones / ...)
   ========================================================================= */
function renderAreas() {
  renderItemList('areasList', state.areas, {
    thumbPath: (a) => a.cover_image,
    titleFn: (a) => `${a.title_pt || '(sem título)'} — /${a.slug}`,
    subtitleFn: (a) => a.subtitle_pt || '',
    onEdit: openAreaModal,
    onDelete: async (a) => { await supabaseClient.from('areas').delete().eq('id', a.id); await reloadAreas(); toast('Área excluída'); },
    onReorder: async (a, b) => { await swapOrder('areas', a, b); await reloadAreas(); },
    onToggleActive: async (a) => { await supabaseClient.from('areas').update({ active: !a.active }).eq('id', a.id); await reloadAreas(); },
  });
}

async function reloadAreas() {
  const { data } = await supabaseClient.from('areas').select('*').order('order_index');
  state.areas = data || [];
  renderAreas();
}

function renderGalleryThumbs(paths) {
  return paths.map((path, index) => `
    <div class="gallery-thumb" data-index="${index}">
      <img src="${publicMediaUrl(path) || ''}" alt="" />
      <button type="button" class="gallery-remove" data-remove-index="${index}">&times;</button>
    </div>
  `).join('');
}

function openAreaModal(area) {
  const isNew = !area;
  const row = area || {};
  let galleryPaths = Array.isArray(row.gallery) ? [...row.gallery] : [];

  const bodyHtml = `
    <form id="areaForm">
      <div class="field full">
        <label>Slug (endereço da página, ex: fotografia)</label>
        <input type="text" id="area_slug" value="${escAttr(row.slug || '')}" placeholder="fotografia" required />
      </div>
      <div class="field full">
        <label>Ícone (usado no card da home)</label>
        <select id="area_icon">
          ${ICON_OPTIONS.map((i) => `<option value="${i}" ${row.icon === i ? 'selected' : ''}>${i}</option>`).join('')}
        </select>
      </div>
      ${imageField('area_cover', 'Imagem de capa (card na home)', row.cover_image)}
      ${langGroup('title', 'Título', 'input', row)}
      ${langGroup('subtitle', 'Subtítulo (resumo curto no card)', 'textarea', row)}
      ${langGroup('description_md', 'Descrição completa (na página da área — aceita Markdown)', 'textarea', row, 8)}
      <div class="field full">
        <label>Galeria de imagens</label>
        <div class="gallery-manager" id="area_gallery_manager">
          ${renderGalleryThumbs(galleryPaths)}
          <label class="gallery-add" title="Adicionar imagem">
            +
            <input type="file" accept="image/*" id="area_gallery_file" style="display:none" />
          </label>
        </div>
      </div>
      ${langGroup('cta_text', 'Texto do botão de contato', 'input', row)}
      <div class="field full">
        <label>Link do botão (ex: #contact ou ../index.html#contact)</label>
        <input type="text" id="area_cta_link" value="${escAttr(row.cta_link || 'index.html#contact')}" />
      </div>
      <div class="field full">
        <label><input type="checkbox" id="area_active" ${row.active !== false ? 'checked' : ''} /> Área ativa (visível no site)</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar área' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Nova área' : 'Editar área', bodyHtml, (body) => {
    wireImageField(body, 'area_cover', 'areas');

    const manager = body.querySelector('#area_gallery_manager');
    const galleryFileInput = body.querySelector('#area_gallery_file');

    function rerenderGallery() {
      manager.querySelectorAll('.gallery-thumb').forEach((el) => el.remove());
      manager.insertAdjacentHTML('afterbegin', renderGalleryThumbs(galleryPaths));
      manager.querySelectorAll('[data-remove-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
          galleryPaths.splice(Number(btn.dataset.removeIndex), 1);
          rerenderGallery();
        });
      });
    }
    rerenderGallery();

    galleryFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const path = await uploadImage(file, 'areas');
        galleryPaths.push(path);
        rerenderGallery();
        toast('Imagem adicionada à galeria.');
      } catch (err) {
        toast('Erro ao enviar imagem: ' + err.message, true);
      }
    });

    body.querySelector('#areaForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const slug = slugify(body.querySelector('#area_slug').value);
      if (!slug) { toast('Informe um slug válido.', true); return; }

      const payload = {
        slug,
        icon: body.querySelector('#area_icon').value,
        cover_image: body.querySelector('#area_cover_value').value || null,
        ...collectLangGroup(body, 'title'),
        ...collectLangGroup(body, 'subtitle'),
        ...collectLangGroup(body, 'description_md'),
        gallery: galleryPaths,
        ...collectLangGroup(body, 'cta_text'),
        cta_link: body.querySelector('#area_cta_link').value.trim() || null,
        active: body.querySelector('#area_active').checked,
      };

      try {
        if (isNew) {
          payload.order_index = state.areas.length;
          const { error } = await supabaseClient.from('areas').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('areas').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadAreas();
        toast('Área salva com sucesso');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   VÍDEOS
   ========================================================================= */
function renderVideos() {
  renderItemList('videosList', state.videos, {
    thumbPath: () => null,
    titleFn: (v) => v.title_pt || v.youtube_id,
    subtitleFn: (v) => v.youtube_id,
    onEdit: openVideoModal,
    onDelete: async (v) => { await supabaseClient.from('videos').delete().eq('id', v.id); await reloadVideos(); toast('Vídeo excluído'); },
    onReorder: async (a, b) => { await swapOrder('videos', a, b); await reloadVideos(); },
    onToggleActive: async (v) => { await supabaseClient.from('videos').update({ active: !v.active }).eq('id', v.id); await reloadVideos(); },
  });
}

async function reloadVideos() {
  const { data } = await supabaseClient.from('videos').select('*').order('order_index');
  state.videos = data || [];
  renderVideos();
}

function openVideoModal(video) {
  const isNew = !video;
  const row = video || {};
  const bodyHtml = `
    <form id="videoForm">
      <div class="field full">
        <label>Link ou ID do vídeo no YouTube (pode colar o link inteiro, tipo youtube.com/watch?v=ABC123 — o ID é extraído automaticamente)</label>
        <input type="text" id="video_youtube_id" value="${escAttr(row.youtube_id || '')}" placeholder="https://youtube.com/watch?v=ABC123xyz" required />
      </div>
      ${langGroup('title', 'Título', 'input', row)}
      ${langGroup('description', 'Descrição curta', 'textarea', row)}
      <div class="field full">
        <label><input type="checkbox" id="video_active" ${row.active !== false ? 'checked' : ''} /> Visível no site</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar vídeo' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Novo vídeo' : 'Editar vídeo', bodyHtml, (body) => {
    body.querySelector('#videoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const youtubeId = extractYoutubeId(body.querySelector('#video_youtube_id').value);
      if (!youtubeId) { toast('Não consegui identificar o ID do vídeo. Confira o link.', true); return; }
      const payload = {
        youtube_id: youtubeId,
        ...collectLangGroup(body, 'title'),
        ...collectLangGroup(body, 'description'),
        active: body.querySelector('#video_active').checked,
      };

      try {
        if (isNew) {
          payload.order_index = state.videos.length;
          const { error } = await supabaseClient.from('videos').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('videos').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadVideos();
        toast('Vídeo salvo com sucesso');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   TIMELINE
   ========================================================================= */
function renderTimeline() {
  renderItemList('timelineList', state.timeline, {
    thumbPath: (t) => t.image_url,
    titleFn: (t) => `${t.date_label_pt ? t.date_label_pt + ' — ' : ''}${t.title_pt || '(sem título)'}`,
    subtitleFn: (t) => t.description_pt || '',
    onEdit: openTimelineModal,
    onDelete: async (t) => { await supabaseClient.from('timeline_items').delete().eq('id', t.id); await reloadTimeline(); toast('Item excluído'); },
    onReorder: async (a, b) => { await swapOrder('timeline_items', a, b); await reloadTimeline(); },
    onToggleActive: async (t) => { await supabaseClient.from('timeline_items').update({ active: !t.active }).eq('id', t.id); await reloadTimeline(); },
  });
}

async function reloadTimeline() {
  const { data } = await supabaseClient.from('timeline_items').select('*').order('order_index');
  state.timeline = data || [];
  renderTimeline();
}

function openTimelineModal(item) {
  const isNew = !item;
  const row = item || {};
  const bodyHtml = `
    <form id="timelineForm">
      ${imageField('tl_image', 'Foto (aparece dentro do círculo)', row.image_url)}
      ${langGroup('date_label', 'Ano / rótulo (ex: 2015)', 'input', row)}
      ${langGroup('title', 'Título', 'input', row)}
      ${langGroup('description', 'Descrição', 'textarea', row)}
      <div class="field full">
        <label><input type="checkbox" id="tl_active" ${row.active !== false ? 'checked' : ''} /> Visível no site</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar marco' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Novo marco na linha do tempo' : 'Editar marco', bodyHtml, (body) => {
    wireImageField(body, 'tl_image', 'timeline');
    body.querySelector('#timelineForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        ...collectLangGroup(body, 'date_label'),
        ...collectLangGroup(body, 'title'),
        ...collectLangGroup(body, 'description'),
        image_url: body.querySelector('#tl_image_value').value || null,
        active: body.querySelector('#tl_active').checked,
      };

      try {
        if (isNew) {
          payload.order_index = state.timeline.length;
          const { error } = await supabaseClient.from('timeline_items').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('timeline_items').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadTimeline();
        toast('Marco salvo com sucesso');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   DEPOIMENTOS
   ========================================================================= */
function renderTestimonials() {
  renderItemList('testimonialsList', state.testimonials, {
    thumbPath: (t) => t.photo_url,
    titleFn: (t) => t.name || '(sem nome)',
    subtitleFn: (t) => t.role_pt || '',
    onEdit: openTestimonialModal,
    onDelete: async (t) => { await supabaseClient.from('testimonials').delete().eq('id', t.id); await reloadTestimonials(); toast('Depoimento excluído'); },
    onReorder: async (a, b) => { await swapOrder('testimonials', a, b); await reloadTestimonials(); },
    onToggleActive: async (t) => { await supabaseClient.from('testimonials').update({ active: !t.active }).eq('id', t.id); await reloadTestimonials(); },
  });
}

async function reloadTestimonials() {
  const { data } = await supabaseClient.from('testimonials').select('*').order('order_index');
  state.testimonials = data || [];
  renderTestimonials();
}

function openTestimonialModal(testimonial) {
  const isNew = !testimonial;
  const row = testimonial || {};
  const bodyHtml = `
    <form id="testimonialForm">
      ${imageField('testimonial_photo', 'Foto (opcional)', row.photo_url)}
      <div class="field full">
        <label>Nome</label>
        <input type="text" id="testimonial_name" value="${escAttr(row.name || '')}" required />
      </div>
      ${langGroup('role', 'Papel/relação (ex: Aluno de Cálculo I)', 'input', row)}
      ${langGroup('quote', 'Depoimento', 'textarea', row)}
      <div class="field full">
        <label><input type="checkbox" id="testimonial_active" ${row.active !== false ? 'checked' : ''} /> Visível no site</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar depoimento' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Novo depoimento' : 'Editar depoimento', bodyHtml, (body) => {
    wireImageField(body, 'testimonial_photo', 'testimonials');
    body.querySelector('#testimonialForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: body.querySelector('#testimonial_name').value.trim(),
        photo_url: body.querySelector('#testimonial_photo_value').value || null,
        ...collectLangGroup(body, 'role'),
        ...collectLangGroup(body, 'quote'),
        active: body.querySelector('#testimonial_active').checked,
      };

      try {
        if (isNew) {
          payload.order_index = state.testimonials.length;
          const { error } = await supabaseClient.from('testimonials').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('testimonials').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadTestimonials();
        toast('Depoimento salvo com sucesso');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   BLOG
   ========================================================================= */
function renderPosts() {
  renderItemList('postsList', state.posts, {
    thumbPath: (p) => p.cover_image,
    titleFn: (p) => `${p.title_pt || '(sem título)'} — /${p.slug}`,
    subtitleFn: (p) => new Date(p.published_at).toLocaleDateString('pt-BR'),
    onEdit: openPostModal,
    onDelete: async (p) => { await supabaseClient.from('blog_posts').delete().eq('id', p.id); await reloadPosts(); toast('Post excluído'); },
    onReorder: async () => { toast('Os posts são ordenados pela data de publicação.', true); },
    onToggleActive: async (p) => { await supabaseClient.from('blog_posts').update({ active: !p.active }).eq('id', p.id); await reloadPosts(); },
  });
}

async function reloadPosts() {
  const { data } = await supabaseClient.from('blog_posts').select('*').order('published_at', { ascending: false });
  state.posts = data || [];
  renderPosts();
}

function toDatetimeLocal(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openPostModal(post) {
  const isNew = !post;
  const row = post || {};
  const bodyHtml = `
    <form id="postForm">
      <div class="field full">
        <label>Slug (endereço do post, ex: minha-primeira-aula-de-drone)</label>
        <input type="text" id="post_slug" value="${escAttr(row.slug || '')}" required />
      </div>
      ${imageField('post_cover', 'Imagem de capa', row.cover_image)}
      ${langGroup('title', 'Título', 'input', row)}
      ${langGroup('excerpt', 'Resumo (aparece na listagem do blog)', 'textarea', row)}
      ${langGroup('content_md', 'Conteúdo completo (aceita Markdown)', 'textarea', row, 12)}
      <div class="field full">
        <label>Data de publicação</label>
        <input type="datetime-local" id="post_published_at" value="${toDatetimeLocal(row.published_at)}" />
      </div>
      <div class="field full">
        <label><input type="checkbox" id="post_active" ${row.active !== false ? 'checked' : ''} /> Publicado (visível no site)</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar post' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Novo post' : 'Editar post', bodyHtml, (body) => {
    wireImageField(body, 'post_cover', 'blog');
    body.querySelector('#postForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const slug = slugify(body.querySelector('#post_slug').value);
      if (!slug) { toast('Informe um slug válido.', true); return; }

      const publishedAtValue = body.querySelector('#post_published_at').value;
      const payload = {
        slug,
        cover_image: body.querySelector('#post_cover_value').value || null,
        ...collectLangGroup(body, 'title'),
        ...collectLangGroup(body, 'excerpt'),
        ...collectLangGroup(body, 'content_md'),
        published_at: publishedAtValue ? new Date(publishedAtValue).toISOString() : new Date().toISOString(),
        active: body.querySelector('#post_active').checked,
      };

      try {
        if (isNew) {
          const { error } = await supabaseClient.from('blog_posts').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('blog_posts').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadPosts();
        toast('Post salvo com sucesso');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   REDES SOCIAIS
   ========================================================================= */
function renderSocial() {
  renderItemList('socialList', state.social, {
    thumbPath: () => null,
    titleFn: (s) => s.platform,
    subtitleFn: (s) => s.url,
    onEdit: openSocialModal,
    onDelete: async (s) => { await supabaseClient.from('social_links').delete().eq('id', s.id); await reloadSocial(); toast('Rede excluída'); },
    onReorder: async (a, b) => { await swapOrder('social_links', a, b); await reloadSocial(); },
    onToggleActive: async (s) => { await supabaseClient.from('social_links').update({ active: !s.active }).eq('id', s.id); await reloadSocial(); },
  });
}

async function reloadSocial() {
  const { data } = await supabaseClient.from('social_links').select('*').order('order_index');
  state.social = data || [];
  renderSocial();
}

function openSocialModal(social) {
  const isNew = !social;
  const row = social || {};
  const bodyHtml = `
    <form id="socialForm">
      <div class="field full">
        <label>Rede social</label>
        <select id="social_platform">
          ${SOCIAL_PLATFORMS.map((p) => `<option value="${p}" ${row.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="field full">
        <label>Link (URL completa)</label>
        <input type="text" id="social_url" placeholder="https://instagram.com/seuperfil" value="${escAttr(row.url || '')}" required />
      </div>
      <div class="field full">
        <label><input type="checkbox" id="social_active" ${row.active !== false ? 'checked' : ''} /> Visível no site</label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">${isNew ? 'Adicionar rede' : 'Salvar alterações'}</button>
      </div>
    </form>
  `;

  openModal(isNew ? 'Nova rede social' : 'Editar rede social', bodyHtml, (body) => {
    body.querySelector('#socialForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        platform: body.querySelector('#social_platform').value,
        url: body.querySelector('#social_url').value.trim(),
        active: body.querySelector('#social_active').checked,
      };

      try {
        if (isNew) {
          payload.order_index = state.social.length;
          const { error } = await supabaseClient.from('social_links').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('social_links').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        closeModal();
        await reloadSocial();
        toast('Rede social salva');
      } catch (err) {
        toast('Erro ao salvar: ' + err.message, true);
      }
    });
  });
}

/* =========================================================================
   MENSAGENS
   ========================================================================= */
function renderMessages() {
  const list = document.getElementById('messagesList');
  list.innerHTML = '';

  const unreadCount = state.messages.filter((m) => !m.is_read).length;
  document.getElementById('unreadDot').hidden = unreadCount === 0;

  if (!state.messages.length) {
    list.innerHTML = '<p class="empty-state">Nenhuma mensagem recebida ainda.</p>';
    return;
  }

  state.messages.forEach((msg) => {
    const row = document.createElement('div');
    row.className = 'message-row' + (msg.is_read ? '' : ' unread') + (msg.id === state.activeMessageId ? ' is-active' : '');
    const date = new Date(msg.created_at).toLocaleString('pt-BR');
    row.innerHTML = `<strong>${esc(msg.name)}</strong><span>${date}</span>`;
    row.addEventListener('click', () => openMessage(msg.id));
    list.appendChild(row);
  });
}

async function openMessage(id) {
  state.activeMessageId = id;
  const msg = state.messages.find((m) => m.id === id);
  renderMessages();

  const detail = document.getElementById('messageDetail');
  const date = new Date(msg.created_at).toLocaleString('pt-BR');
  detail.innerHTML = `
    <h3>${esc(msg.name)}</h3>
    <div class="meta">${esc(msg.email)} ${msg.phone ? '· ' + esc(msg.phone) : ''} · ${date}</div>
    <div class="body-text">${esc(msg.message)}</div>
    <div class="modal-actions">
      <button class="icon-btn danger" id="deleteMsgBtn" title="Excluir">🗑 Excluir</button>
    </div>
  `;

  detail.querySelector('#deleteMsgBtn').addEventListener('click', async () => {
    if (await confirmDelete('Excluir esta mensagem?')) {
      await supabaseClient.from('contact_messages').delete().eq('id', id);
      state.messages = state.messages.filter((m) => m.id !== id);
      state.activeMessageId = null;
      detail.innerHTML = '<p class="empty-state">Selecione uma mensagem para visualizar.</p>';
      renderMessages();
      toast('Mensagem excluída');
    }
  });

  if (!msg.is_read) {
    await supabaseClient.from('contact_messages').update({ is_read: true }).eq('id', id);
    msg.is_read = true;
    renderMessages();
  }
}

/* =========================================================================
   Botões "+ Novo"
   ========================================================================= */
function setupAddButtons() {
  document.getElementById('addSlideBtn').addEventListener('click', () => openSlideModal(null));
  document.getElementById('addAreaBtn').addEventListener('click', () => openAreaModal(null));
  document.getElementById('addVideoBtn').addEventListener('click', () => openVideoModal(null));
  document.getElementById('addTimelineBtn').addEventListener('click', () => openTimelineModal(null));
  document.getElementById('addTestimonialBtn').addEventListener('click', () => openTestimonialModal(null));
  document.getElementById('addPostBtn').addEventListener('click', () => openPostModal(null));
  document.getElementById('addSocialBtn').addEventListener('click', () => openSocialModal(null));
}

/* =========================================================================
   Bootstrap
   ========================================================================= */
initAuth();
