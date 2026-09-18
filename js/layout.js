/**
 * Lógica compartilhada entre TODAS as páginas públicas (home, área, blog,
 * post, vídeos): aplicar configurações visuais, montar header/footer,
 * troca de idioma e ícones SVG. Cada página importa daqui em vez de
 * duplicar essa lógica.
 */
import { supabaseClient, publicMediaUrl } from './supabase-client.js';
import { t, LANG_LABELS } from './i18n.js';

export const DEMO_SETTINGS = {
  company_name: 'Marcos Cozatti',
  logo_url: null,
  favicon_url: null,
  font_family: 'Inter',
  heading_font_family: 'Playfair Display',
  font_size_base: 16,
  accent_color: '#1F9E8B',
  slide_interval_ms: 5000,
  enabled_languages: ['pt'],
  default_lang: 'pt',
  phone: null,
  whatsapp: null,
  footer_email: null,
  address: null,
  contact_recipient_email: null,
};

export const DEMO_SOCIAL = [
  { platform: 'youtube', url: 'https://www.youtube.com/@marcoscozatti' },
];

export const ICONS = {
  star: '<path d="M12 2l2.9 6.6L22 9.3l-5 4.8 1.3 7L12 17.8 5.7 21l1.3-7-5-4.8 7.1-.7L12 2z"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.4"/><path d="M8 7l1.4-2h5.2L16 7"/>',
  drone: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6V6M12 18v-3.6M9.6 12H6M18 12h-3.6"/><circle cx="5" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M18 3v16"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
};

export const SOCIAL_ICONS = {
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V8h4v1.8A5 5 0 0 1 16 8z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.3-5a8.5 8.5 0 1 1 16.7-3.5z"/><path d="M8.5 9.5c0 4 3 7 7 7"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l6 3-6 3z"/>',
  tiktok: '<path d="M14 3v11a3 3 0 1 1-3-3"/><path d="M14 3a5 5 0 0 0 5 5"/>',
  twitter: '<path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.7A11.4 11.4 0 0 1 3.6 4.6a4 4 0 0 0 1.2 5.4c-.6 0-1.3-.2-1.8-.5v.1a4 4 0 0 0 3.2 4 4 4 0 0 1-1.8.1 4 4 0 0 0 3.8 2.8A8.1 8.1 0 0 1 2 18.4a11.4 11.4 0 0 0 6.2 1.8c7.4 0 11.5-6.3 11.5-11.7v-.5c.8-.6 1.5-1.3 2-2.1z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
};

export function svgIcon(map, key) {
  const d = map[key] || map.star || map.link;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

/** Busca configurações + redes sociais (cai para o demo se o Supabase falhar). */
export async function loadSiteSettings() {
  let settings = DEMO_SETTINGS;
  let social = DEMO_SOCIAL;
  if (!supabaseClient) return { settings, social };

  try {
    const [settingsRes, socialRes] = await Promise.all([
      supabaseClient.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabaseClient.from('social_links').select('*').eq('active', true).order('order_index'),
    ]);
    if (settingsRes.data) settings = settingsRes.data;
    if (socialRes.data?.length) social = socialRes.data;
  } catch (err) {
    console.warn('[MarcosCozatti] usando configurações de demonstração:', err.message);
  }
  return { settings, social };
}

/** Aplica cores/fontes/branding/rodapé/WhatsApp — chamado em toda página pública. */
export function applySiteSettings(settings) {
  const s = settings || DEMO_SETTINGS;
  const root = document.documentElement;

  root.style.setProperty('--font-body', `'${s.font_family || 'Inter'}', system-ui, sans-serif`);
  root.style.setProperty('--font-heading', `'${s.heading_font_family || 'Playfair Display'}', Georgia, serif`);
  root.style.setProperty('--font-size-base', `${s.font_size_base || 16}px`);
  if (s.accent_color) root.style.setProperty('--color-accent', s.accent_color);

  const fontsToLoad = [...new Set([s.font_family, s.heading_font_family].filter(Boolean))];
  const fontsLink = document.getElementById('google-fonts-link');
  if (fontsToLoad.length && fontsLink) {
    const families = fontsToLoad
      .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`)
      .join('&');
    fontsLink.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }

  const brandName = s.company_name || 'Marcos Cozatti';
  if (!document.title || document.title === 'Marcos Cozatti') document.title = brandName;

  const footerBrand = document.getElementById('footerBrand');
  if (footerBrand) footerBrand.textContent = brandName;

  const brandFallback = document.getElementById('brandFallback');
  if (brandFallback) brandFallback.innerHTML = `<span class="star">✦</span> ${brandName.split(' ')[0]}`;

  const logoUrl = publicMediaUrl(s.logo_url);
  if (logoUrl) {
    const img = document.getElementById('logoImg');
    if (img) {
      img.src = logoUrl;
      img.hidden = false;
      if (brandFallback) brandFallback.hidden = true;
    }
  }

  const faviconUrl = publicMediaUrl(s.favicon_url);
  const faviconEl = document.getElementById('favicon');
  if (faviconUrl && faviconEl) faviconEl.href = faviconUrl;

  setDetail('infoPhone', 'infoPhoneValue', s.phone);
  setDetail('infoEmail', 'infoEmailValue', s.footer_email);
  setDetail('infoAddress', 'infoAddressValue', s.address);

  const footerCopy = document.getElementById('footerCopy');
  if (footerCopy) {
    footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} ${brandName} — <span data-i18n="footer_rights"></span>`;
  }
  setText('footerPhone', s.phone || '—');
  setText('footerEmail', s.footer_email || '—');
  setText('footerAddress', s.address || '—');

  const wa = document.getElementById('whatsappFloat');
  if (wa) {
    if (s.whatsapp) {
      const digits = s.whatsapp.replace(/\D/g, '');
      wa.href = `https://wa.me/${digits}`;
      wa.hidden = false;
    } else {
      wa.hidden = true;
    }
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setDetail(wrapId, valueId, value) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  if (!value) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const valueEl = document.getElementById(valueId);
  if (valueEl) valueEl.textContent = value;
}

export function renderSocial(social) {
  const row = document.getElementById('socialRow');
  if (!row) return;
  row.innerHTML = '';
  (social || []).forEach((link) => {
    const a = document.createElement('a');
    a.className = 'social-bubble';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', link.platform);
    a.innerHTML = svgIcon(SOCIAL_ICONS, (link.platform || '').toLowerCase());
    row.appendChild(a);
  });
}

export function setupHeaderInteractions() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  });

  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.style.display === 'flex';
    nav.style.display = isOpen ? 'none' : 'flex';
    nav.style.cssText += isOpen ? '' : 'position:absolute;top:100%;left:0;right:0;flex-direction:column;background:rgba(11,18,32,0.97);padding:20px 24px;gap:18px;';
  });

  document.querySelectorAll('.main-nav a').forEach((a) => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900) nav.style.display = 'none';
    });
  });
}

export function detectInitialLang(settings) {
  const enabled = (settings.enabled_languages && settings.enabled_languages.length)
    ? settings.enabled_languages
    : ['pt'];
  let stored = null;
  try { stored = localStorage.getItem('mc_lang'); } catch (e) {}
  if (stored && enabled.includes(stored)) return stored;
  return settings.default_lang && enabled.includes(settings.default_lang)
    ? settings.default_lang
    : enabled[0];
}

export function buildLangSwitch(settings, currentLang, onChange) {
  const enabled = (settings.enabled_languages && settings.enabled_languages.length)
    ? settings.enabled_languages
    : ['pt'];
  const wrap = document.getElementById('langSwitch');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (enabled.length < 2) return;

  enabled.forEach((code) => {
    const btn = document.createElement('button');
    btn.textContent = LANG_LABELS[code] || code.toUpperCase();
    btn.className = code === currentLang ? 'is-active' : '';
    btn.addEventListener('click', () => onChange(code));
    wrap.appendChild(btn);
  });
}

let markedPromise = null;
/** Converte Markdown em HTML (usado nas Áreas e no Blog). Cai para
 * parágrafos simples caso o CDN do `marked` não possa ser carregado. */
export async function renderMarkdown(mdText) {
  if (!mdText) return '';
  if (!markedPromise) {
    markedPromise = import('https://cdn.jsdelivr.net/npm/marked@12/+esm')
      .then((mod) => mod.marked || mod.default)
      .catch((err) => {
        console.warn('[MarcosCozatti] Não foi possível carregar o Markdown (CDN indisponível).', err);
        return null;
      });
  }
  const marked = await markedPromise;
  if (marked) return marked.parse(mdText);
  return mdText
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export function applyStaticI18n(lang) {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  try { localStorage.setItem('mc_lang', lang); } catch (e) {}
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.getAttribute('data-i18n'));
  });
}
