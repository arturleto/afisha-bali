// Афиша Бали · ядро: данные, даты по времени Бали, фильтры, тексты, обложки.
// Данные берутся из events.json (его пересобирает scripts/update_site.sh раз в 50 минут).
(() => {
  const DAY = 86400000;
  const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MON_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const baliNow = () => new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return many; if (b > 1 && b < 5) return few; if (b === 1) return one; return many; };

  const CATS = ['Вечеринки и клубы', 'Бизнес и нетворкинг', 'Поездки по острову', 'Настольные игры', 'Просто собраться', 'Волонтёрство и экология', 'Йога и практики', 'Мастер-классы и квартирники', 'Арт, лекции, кино', 'Еда и маркеты', 'Спорт', 'Для детей'];
  const OLD = { 'Нетворкинги и бизнес': 'Бизнес и нетворкинг', 'Йога, велнес, ретриты': 'Йога и практики', 'Покатушки': 'Поездки по острову', 'Семейное и дети': 'Для детей' };
  const CATS_EN = { 'Вечеринки и клубы': 'Parties & clubs', 'Бизнес и нетворкинг': 'Business & networking', 'Поездки по острову': 'Island trips', 'Настольные игры': 'Board games', 'Просто собраться': 'Hang out', 'Волонтёрство и экология': 'Volunteering & eco', 'Йога и практики': 'Yoga & practices', 'Мастер-классы и квартирники': 'Workshops & house gigs', 'Арт, лекции, кино': 'Art, talks, cinema', 'Еда и маркеты': 'Food & markets', 'Спорт': 'Sport', 'Для детей': 'For kids' };
  const AREAS = ['Чангу', 'Убуд', 'Семиньяк', 'Улувату', 'Букит', 'Санур', 'Денпасар'];
  const AREAS_EN = { 'Чангу': 'Canggu', 'Убуд': 'Ubud', 'Семиньяк': 'Seminyak', 'Улувату': 'Uluwatu', 'Букит': 'Bukit', 'Санур': 'Sanur', 'Денпасар': 'Denpasar' };
  const COVER = {
    'Вечеринки и клубы': ['#ff3d8b', '#5b2bff', 'ВЕЧЕРИНКА'], 'Бизнес и нетворкинг': ['#00c2a8', '#2f5bff', 'БИЗНЕС'],
    'Поездки по острову': ['#21c8f6', '#0050d8', 'ПОЕЗДКА'], 'Настольные игры': ['#ffb000', '#ff4d6d', 'ИГРЫ'],
    'Просто собраться': ['#ff9a3c', '#ff3d8b', 'ВСТРЕЧА'], 'Волонтёрство и экология': ['#2fe07a', '#0a7d5a', 'ЭКОЛОГИЯ'],
    'Йога и практики': ['#ff9a3c', '#c13dff', 'ПРАКТИКИ'], 'Мастер-классы и квартирники': ['#ff5a5f', '#ffb347', 'МАСТЕР-КЛАСС'],
    'Арт, лекции, кино': ['#5a3df5', '#21c8f6', 'АРТ И КИНО'], 'Еда и маркеты': ['#9be22d', '#11a36a', 'МАРКЕТ'],
    'Спорт': ['#c8ff3d', '#00a3a3', 'СПОРТ'], 'Для детей': ['#ff8fb1', '#ffb36b', 'ДЕТЯМ'],
  };

  const state = { when: 'week', area: 'all', cat: 'all', free: false, lang: 'ru' };
  try { const s = JSON.parse(localStorage.getItem('afisha-state') || '{}'); if (s.lang) state.lang = s.lang; } catch (e) {}
  const T = (ru, en) => (state.lang === 'en' ? en : ru);

  let today = parse(ymd(baliNow()));
  let events = [], meta = {};

  const WD_MATCH = [/воскрес|\bвс\b/i, /понедел|\bпн\b/i, /вторник|\bвт\b/i, /сред|\bср\b/i, /четверг|\bчт\b/i, /пятниц|\bпт\b/i, /суббот|\bсб\b/i];
  function nextRecurring(rec) {
    if (/ежеднев|кажд\w*\s*день|каждодн|\bdaily\b/i.test(rec)) return today;
    let days = WD_MATCH.map((re, i) => (re.test(rec) ? i : -1)).filter((i) => i >= 0);
    if (!days.length && /выходн|\bweekend/i.test(rec)) days = [0, 6];
    if (!days.length && /будн|рабоч\w*\s*дн|\bweekday/i.test(rec)) days = [1, 2, 3, 4, 5];
    if (!days.length) return null;
    for (let k = 0; k < 7; k++) { const d = new Date(today.getTime() + k * DAY); if (days.includes(d.getDay())) return d; }
    return null;
  }

  // время начала в мс (по Бали); прошедшее сегодня больше 3 часов назад скрываем
  function startMs(e) {
    if (!e.time) return null;
    const [h, m] = e.time.split(':').map(Number);
    return Date.UTC(e._d.getFullYear(), e._d.getMonth(), e._d.getDate(), h - 8, m || 0);
  }

  function load(raw, m) {
    today = parse(ymd(baliNow()));
    meta = m || {};
    const out = [];
    (raw || []).forEach((src, i) => {
      const e = Object.assign({}, src);
      e.category = OLD[e.category] || e.category;
      e.audience = e.audience || [];
      let d = e.date ? parse(e.date) : null;
      const end = e.date_end ? parse(e.date_end) : null;
      if (e.recurring) { const n = nextRecurring(e.recurring); if (n) d = n; }
      if (!d) return;
      if (end && end >= today && d < today) d = today;
      if (d < today) return;
      e._i = i; e._d = d; e._key = ymd(d);
      const st = startMs(e);
      if (e._key === ymd(today) && st && !e.date_end && Date.now() - st > 3 * 3600000) return;
      out.push(e);
    });
    out.sort((a, b) => a._d - b._d || String(a.time || '99').localeCompare(String(b.time || '99')));
    events = out;
  }

  const diffDays = (e) => Math.round((e._d - today) / DAY);
  function inWindow(e, when) {
    const diff = diffDays(e);
    if (when === 'today') return diff === 0;
    if (when === 'tomorrow') return diff === 1;
    if (when === 'weekend') { const wd = today.getDay(); const toSat = wd === 0 ? -1 : 6 - wd; return diff >= Math.max(0, toSat) && diff <= toSat + 1; }
    if (when === 'week') return diff < 7;
    return true;
  }
  const isFree = (e) => e.price_type === 'free' || e.price_type === 'donation';
  function matchCat(e, cat) {
    if (cat === 'all') return true;
    if (cat === 'women') return e.audience.includes('женщинам');
    if (cat === 'kids') return e.category === 'Для детей' || e.audience.includes('детям');
    return e.category === cat;
  }
  function filtered(over = {}) {
    const s = Object.assign({}, state, over);
    return events.filter((e) => inWindow(e, s.when) && (s.area === 'all' || e.area === s.area) && matchCat(e, s.cat) && (!s.free || isFree(e)));
  }
  function groupByDay(list) {
    const m = new Map();
    list.forEach((e) => { if (!m.has(e._key)) m.set(e._key, []); m.get(e._key).push(e); });
    return [...m.entries()].map(([k, items]) => ({ key: k, date: parse(k), items }));
  }

  function dayLabel(d) {
    const diff = Math.round((d - today) / DAY);
    if (diff === 0) return T('Сегодня', 'Today');
    if (diff === 1) return T('Завтра', 'Tomorrow');
    return T(`${WD_FULL[d.getDay()]}, ${d.getDate()} ${MON_RU[d.getMonth()]}`, `${WD_EN[d.getDay()]}, ${d.getDate()} ${MON_EN[d.getMonth()]}`);
  }
  const title = (e) => (state.lang === 'en' ? e.title_en : e.title_ru) || e.title_ru || e.title_en || '';
  const summary = (e) => (state.lang === 'en' ? e.summary_en : e.summary_ru) || e.summary_ru || '';
  const catName = (c) => (state.lang === 'en' ? CATS_EN[c] || c : c);
  const areaName = (a) => (state.lang === 'en' ? AREAS_EN[a] || a : a);
  function price(e) {
    if (e.price_type === 'free') return { cls: 'is-free', text: T('БЕСПЛАТНО', 'FREE') };
    if (e.price_type === 'donation') return { cls: 'is-don', text: T('ДОНЕЙШН', 'DONATION') };
    if (e.price_type === 'paid') return { cls: 'is-paid', text: e.price || T('Платно', 'Paid') };
    return { cls: 'is-unknown', text: T('цена не указана', 'price on request') };
  }
  function timeText(e) {
    let t = e.time || '';
    if (t && e.time_end) t += '-' + e.time_end;
    if (e.recurring) t = (t ? t + ' · ' : '') + e.recurring;
    if (e.date_end && e.date_end !== e.date) { const de = parse(e.date_end); t = (t ? t + ' · ' : '') + T('до ', 'until ') + de.getDate() + ' ' + (state.lang === 'en' ? MON_EN : MON_SHORT)[de.getMonth()]; }
    return t;
  }
  const placeText = (e) => [e.place, e.area].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  const nEvents = (n) => T(`${n} ${plural(n, 'событие', 'события', 'событий')}`, `${n} event${n === 1 ? '' : 's'}`);

  const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const coverCache = {};
  function cover(e) {
    const key = e.source_tg_message_url + (e.title_ru || '');
    if (coverCache[key]) return coverCache[key];
    const [c1, c2, word] = COVER[e.category] || ['#5b2bff', '#ff3d8b', 'БАЛИ'];
    const h = hash(key), ang = h % 360, x1 = 15 + (h % 50), y1 = 10 + ((h >> 3) % 40), x2 = 55 + ((h >> 5) % 40), y2 = 50 + ((h >> 7) % 40);
    const fs = Math.round(Math.min(96, 400 / (word.length * 0.74)));
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><defs><linearGradient id='g' gradientTransform='rotate(${ang} .5 .5)'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient><filter id='b'><feGaussianBlur stdDeviation='50'/></filter></defs><rect width='600' height='600' fill='#0b0814'/><rect width='600' height='600' fill='url(#g)' opacity='.92'/><g filter='url(#b)'><circle cx='${x1 * 6}' cy='${y1 * 6}' r='170' fill='#fff' opacity='.3'/><circle cx='${x2 * 6}' cy='${y2 * 6}' r='190' fill='#000' opacity='.35'/></g><text x='300' y='${300 + fs * 0.36}' text-anchor='middle' font-family='Arial Black,Helvetica,Arial,sans-serif' font-weight='900' font-size='${fs}' letter-spacing='-2' fill='#fff'>${word}</text><text x='300' y='${300 - fs * 0.72}' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='700' font-size='17' letter-spacing='6' fill='#fff' opacity='.75'>АФИША БАЛИ</text></svg>`;
    return (coverCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  const img = (e) => e.poster || cover(e);

  const ICON_TG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M21.4 4.1 2.9 11.3c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5Zm-3.1 3.3-8.6 7.8-.3 3.5-1.6-5.2 10-6.3c.4-.3.8 0 .5.2Z"/></svg>';
  function buttons(e, opts = {}) {
    let h = `<a class="btn-src" href="${esc(e.source_tg_message_url)}" target="_blank" rel="noopener">${ICON_TG}<span>${T('Открыть источник', 'Open source')}</span></a>`;
    if (!opts.compact) h += `<a class="btn-chat" href="${esc(e.source_tg_chat_url)}" target="_blank" rel="noopener">${T('Чат целиком', 'Whole chat')}</a>`;
    if (e.ticket_url) h += `<a class="btn-ticket" href="${esc(e.ticket_url)}" target="_blank" rel="noopener">${T('Купить билет', 'Tickets')}</a>`;
    else if (e.contact && !opts.compact) h += `<a class="btn-chat" href="https://t.me/${esc(String(e.contact).replace(/^@/, '').split(/\s/)[0])}" target="_blank" rel="noopener">${T('Написать организатору', 'Message host')}</a>`;
    return h;
  }

  // файл календаря .ics для события
  function ics(e) {
    const p = (n) => String(n).padStart(2, '0');
    const d = e._d, [h, m] = (e.time || '10:00').split(':').map(Number);
    const st = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h - 8, m || 0));
    const en = new Date(st.getTime() + 2 * 3600000);
    const f = (x) => `${x.getUTCFullYear()}${p(x.getUTCMonth() + 1)}${p(x.getUTCDate())}T${p(x.getUTCHours())}${p(x.getUTCMinutes())}00Z`;
    const txt = (s) => String(s || '').replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, ' ');
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//afisha-bali//RU', 'BEGIN:VEVENT', `UID:${hash(e.source_tg_message_url + e.title_ru)}@afisha-bali`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(st)}`, `DTEND:${f(en)}`, `SUMMARY:${txt(e.title_ru)}`, `LOCATION:${txt(placeText(e))}`, `DESCRIPTION:${txt(e.summary_ru + ' ' + e.source_tg_message_url)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }

  function stats() {
    const week = events.filter((e) => diffDays(e) < 7);
    return { week: week.length, today: events.filter((e) => diffDays(e) === 0).length, free: week.filter(isFree).length, chats: meta.chats_read || 0 };
  }

  function initTheme() {
    let t = 'dark';
    try { t = localStorage.getItem('afisha-theme') || 'dark'; } catch (e) {}
    const q = /[?&]theme=(light|dark)/.exec(location.search || ''); if (q) t = q[1];
    document.documentElement.dataset.theme = t;
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
      const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = n;
      try { localStorage.setItem('afisha-theme', n); } catch (e) {}
    }));
  }
  function setLang(l) {
    state.lang = l;
    try { localStorage.setItem('afisha-state', JSON.stringify({ lang: l })); } catch (e) {}
    document.documentElement.lang = l;
    document.querySelectorAll('[data-ru]').forEach((el) => { el.textContent = l === 'en' ? el.dataset.en : el.dataset.ru; });
    document.querySelectorAll('[data-lang-btn]').forEach((b) => b.classList.toggle('is-on', b.dataset.langBtn === l));
  }

  window.Afisha = {
    state, T, load, filtered, groupByDay, dayLabel, title, summary, catName, areaName, price, timeText, placeText, nEvents, plural,
    img, buttons, ics, stats, initTheme, setLang, esc, ymd, parse, CATS, AREAS, MON_RU, WD_SHORT, WD_EN, DAY, isFree, startMs,
    get events() { return events; }, get meta() { return meta; }, get today() { return today; },
  };
})();
