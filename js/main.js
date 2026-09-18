import { supabaseClient, publicMediaUrl } from './supabase-client.js';
import { t, pickLang } from './i18n.js';
import {
  ICONS, svgIcon, escapeHtml, escapeAttr,
  loadSiteSettings, applySiteSettings, renderSocial, setupHeaderInteractions,
  detectInitialLang, buildLangSwitch, applyStaticI18n,
} from './layout.js';

/* =========================================================================
   Conteúdo de demonstração (usado quando o Supabase ainda não foi
   configurado em js/config.js, ou enquanto os dados carregam). Tudo aqui
   é só placeholder — edite pelo painel /admin depois de configurar o banco.
   ========================================================================= */
const DEMO = {
  slides: [
    {
      image_url: null,
      title_pt: 'Professor, fotógrafo e piloto de drone',
      subtitle_pt: 'Aulas, imagens e histórias contadas de perto — e do alto.',
      cta_text_pt: 'Fale comigo',
      cta_link: '#contact',
    },
    {
      image_url: null,
      title_pt: 'Conteúdo no YouTube',
      subtitle_pt: 'Acompanhe aulas, bastidores e vídeos aéreos no canal.',
      cta_text_pt: 'Ver vídeos',
      cta_link: 'videos.html',
    },
  ],
  areas: [
    {
      slug: 'servicos',
      icon: 'briefcase',
      cover_image: null,
      title_pt: 'Aulas e Mentoria',
      subtitle_pt: 'Aulas particulares, cursos, palestras e mentoria — adicione os detalhes pelo painel admin.',
    },
    {
      slug: 'fotografia',
      icon: 'camera',
      cover_image: null,
      title_pt: 'Fotografia',
      subtitle_pt: 'Ensaios, eventos e retratos — adicione seu portfólio pelo painel admin.',
    },
    {
      slug: 'drones',
      icon: 'drone',
      cover_image: null,
      title_pt: 'Drones',
      subtitle_pt: 'Imagens e vídeos aéreos — adicione seu portfólio pelo painel admin.',
    },
  ],
  timeline: [
    { date_label_pt: '—', title_pt: 'Adicione um marco', description_pt: 'Use o painel /admin em "Sobre / Linha do tempo" para contar sua trajetória.', image_url: null },
  ],
  testimonials: [
    { name: 'Depoimento de exemplo', role_pt: 'Adicione depoimentos reais pelo painel admin', quote_pt: 'Cadastre depoimentos de alunos e clientes em /admin.', photo_url: null },
  ],
};

const state = {
  lang: 'pt',
  settings: null,
  social: [],
  slides: DEMO.slides,
  areas: DEMO.areas,
  timeline: DEMO.timeline,
  testimonials: DEMO.testimonials,
  sliderTimer: null,
  activeSlide: 0,
};

async function loadPageData() {
  if (!supabaseClient) return;
  try {
    const [slidesRes, areasRes, timelineRes, testimonialsRes] = await Promise.all([
      supabaseClient.from('hero_slides').select('*').eq('active', true).order('order_index'),
      supabaseClient.from('areas').select('*').eq('active', true).order('order_index'),
      supabaseClient.from('timeline_items').select('*').eq('active', true).order('order_index'),
      supabaseClient.from('testimonials').select('*').eq('active', true).order('order_index'),
    ]);
    if (slidesRes.data?.length) state.slides = slidesRes.data;
    if (areasRes.data?.length) state.areas = areasRes.data;
    if (timelineRes.data?.length) state.timeline = timelineRes.data;
    if (testimonialsRes.data?.length) state.testimonials = testimonialsRes.data;
  } catch (err) {
    console.warn('[MarcosCozatti] usando conteúdo de demonstração:', err.message);
  }
}

/* =========================================================================
   Hero / Slider
   ========================================================================= */
function renderHero() {
  const container = document.getElementById('heroSlides');
  const dotsWrap = document.getElementById('heroDots');
  container.innerHTML = '';
  dotsWrap.innerHTML = '';

  const durationSec = (state.settings.slide_interval_ms || 5000) / 1000;
  document.documentElement.style.setProperty('--slide-duration', `${durationSec}s`);

  state.slides.forEach((slide, i) => {
    const el = document.createElement('div');
    el.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
    const img = publicMediaUrl(slide.image_url);
    const title = pickLang(slide, 'title', state.lang);
    const subtitle = pickLang(slide, 'subtitle', state.lang);
    const ctaText = pickLang(slide, 'cta_text', state.lang) || t(state.lang, 'hero_cta_default');

    el.innerHTML = `
      <div class="slide-bg" style="${img ? `background-image:url('${img}')` : 'background:linear-gradient(135deg,#101a2e,#1c2a46)'}"></div>
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <span class="eyebrow">Marcos Cozatti</span>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        ${slide.cta_link ? `<a href="${escapeAttr(slide.cta_link)}" class="btn btn-accent">${escapeHtml(ctaText)}</a>` : ''}
      </div>
    `;
    container.appendChild(el);

    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' is-active' : '');
    dot.innerHTML = '<span></span>';
    dot.addEventListener('click', () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });

  state.activeSlide = 0;
  startSlider();
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;

  const next = (index + slides.length) % slides.length;
  slides[state.activeSlide]?.classList.remove('is-active');
  dots[state.activeSlide]?.classList.remove('is-active');
  slides[next].classList.add('is-active');
  dots[next].classList.add('is-active');
  state.activeSlide = next;
  restartSliderTimer();
}

function startSlider() {
  restartSliderTimer();
  document.getElementById('heroNext').onclick = () => goToSlide(state.activeSlide + 1);
  document.getElementById('heroPrev').onclick = () => goToSlide(state.activeSlide - 1);
}

function restartSliderTimer() {
  clearInterval(state.sliderTimer);
  if (state.slides.length <= 1) return;
  const interval = state.settings.slide_interval_ms || 5000;
  state.sliderTimer = setInterval(() => goToSlide(state.activeSlide + 1), interval);
}

/* =========================================================================
   Áreas (cards que levam a area.html, vídeos e blog)
   ========================================================================= */
function renderAreas() {
  const grid = document.getElementById('areasGrid');
  grid.innerHTML = '';

  state.areas.forEach((area) => {
    const img = publicMediaUrl(area.cover_image);
    const title = pickLang(area, 'title', state.lang);
    const subtitle = pickLang(area, 'subtitle', state.lang);
    const card = document.createElement('a');
    card.className = 'area-card';
    card.href = `area.html?slug=${encodeURIComponent(area.slug)}`;
    card.innerHTML = `
      <div class="area-card-media">
        ${img ? `<img src="${img}" alt="${escapeAttr(title)}" />` : ''}
        <span class="icon-wrap">${svgIcon(ICONS, area.icon)}</span>
      </div>
      <div class="area-card-body">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
        <span class="area-card-link">${escapeHtml(t(state.lang, 'blog_read_more'))} →</span>
      </div>
    `;
    grid.appendChild(card);
  });

  // Vídeos e Blog têm páginas dedicadas próprias (fora da tabela "areas")
  const extra = [
    { href: 'videos.html', icon: 'play', title: t(state.lang, 'videos_title'), subtitle: t(state.lang, 'videos_subtitle') },
    { href: 'blog.html', icon: 'book', title: t(state.lang, 'blog_title'), subtitle: t(state.lang, 'blog_subtitle') },
  ];
  extra.forEach((item) => {
    const card = document.createElement('a');
    card.className = 'area-card';
    card.href = item.href;
    card.innerHTML = `
      <div class="area-card-media">
        <span class="icon-wrap">${svgIcon(ICONS, item.icon)}</span>
      </div>
      <div class="area-card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.subtitle)}</p>
        <span class="area-card-link">${escapeHtml(t(state.lang, 'blog_read_more'))} →</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* =========================================================================
   Timeline
   ========================================================================= */
function renderTimeline() {
  const wrap = document.getElementById('timeline');
  wrap.innerHTML = '';

  state.timeline.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'timeline-item';
    const img = publicMediaUrl(item.image_url);
    const title = pickLang(item, 'title', state.lang);
    const desc = pickLang(item, 'description', state.lang);
    const date = pickLang(item, 'date_label', state.lang);

    el.innerHTML = `
      <div class="tl-content">
        ${date ? `<span class="tl-date">${escapeHtml(date)}</span>` : ''}
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(desc)}</p>
      </div>
      <div class="tl-media">
        <div class="tl-circle">
          ${img ? `<img src="${img}" alt="${escapeAttr(title)}" />` : `<span class="tl-fallback">✦</span>`}
        </div>
        <div class="tl-vertex"></div>
      </div>
      <div class="tl-spacer"></div>
    `;
    wrap.appendChild(el);
  });
}

/* =========================================================================
   Depoimentos
   ========================================================================= */
function renderTestimonials() {
  const grid = document.getElementById('testimonialsGrid');
  grid.innerHTML = '';

  state.testimonials.forEach((item) => {
    const img = publicMediaUrl(item.photo_url);
    const quote = pickLang(item, 'quote', state.lang);
    const role = pickLang(item, 'role', state.lang);
    const initial = (item.name || '?').trim().charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <p class="quote">${escapeHtml(quote)}</p>
      <div class="testimonial-author">
        ${img ? `<img src="${img}" alt="${escapeAttr(item.name)}" />` : `<span class="avatar-fallback">${escapeHtml(initial)}</span>`}
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          ${role ? `<span>${escapeHtml(role)}</span>` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* =========================================================================
   Formulário de contato
   ========================================================================= */
function setupContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  const submitBtn = document.getElementById('contactSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || null,
      message: form.message.value.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) return;

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = t(state.lang, 'contact_sending');

    try {
      if (!supabaseClient) throw new Error('Supabase não configurado');
      const { error } = await supabaseClient.from('contact_messages').insert(payload);
      if (error) throw error;

      supabaseClient.functions.invoke('send-contact-email', { body: payload }).catch(() => {});

      status.textContent = t(state.lang, 'contact_success');
      status.classList.add('success');
      form.reset();
    } catch (err) {
      console.error(err);
      status.textContent = t(state.lang, 'contact_error');
      status.classList.add('error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = t(state.lang, 'contact_send');
    }
  });
}

/* =========================================================================
   Idioma
   ========================================================================= */
function setLang(lang) {
  state.lang = lang;
  applyStaticI18n(lang);
  buildLangSwitch(state.settings, state.lang, setLang);
  renderHero();
  renderAreas();
  renderTimeline();
  renderTestimonials();
}

/* =========================================================================
   Bootstrap
   ========================================================================= */
async function init() {
  const { settings, social } = await loadSiteSettings();
  state.settings = settings;
  state.social = social;
  await loadPageData();

  applySiteSettings(state.settings);
  renderSocial(state.social);
  setupContactForm();
  setupHeaderInteractions();
  setLang(detectInitialLang(state.settings));
}

init();
