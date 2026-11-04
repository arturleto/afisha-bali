// Афиша Бали · страница: карусель, неделя, бесплатное, окна. Данные из events.json, проверка обновления каждые 10 минут.
(() => {
  const A = window.Afisha, S = A.state, E = A.esc, T = A.T;
  A.initTheme();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const WHEN = [['today', 'Сегодня', 'Today'], ['tomorrow', 'Завтра', 'Tomorrow'], ['weekend', 'Выходные', 'Weekend'], ['week', 'Неделя', 'Week'], ['all', 'Всё впереди', 'All upcoming']];
  let builtAt = null;

  // ---------- фильтры ----------
  function chipsWhen() {
    $('whenRow').innerHTML = WHEN.map(([k, ru, en]) => `<button class="chip ${S.when === k ? 'is-on' : ''}" data-when="${k}">${T(ru, en)} <small>${A.filtered({ when: k }).length}</small></button>`).join('');
  }
  function chipsArea(id, sm) {
    const has = new Set(A.events.map((e) => e.area));
    $(id).innerHTML = `<button class="chip ${sm ? 'chip--sm' : ''} ${S.area === 'all' ? 'is-on' : ''}" data-area="all">${T('Весь остров', 'Whole island')}</button>` +
      A.AREAS.filter((a) => has.has(a)).map((a) => `<button class="chip ${sm ? 'chip--sm' : ''} ${S.area === a ? 'is-on' : ''}" data-area="${a}">${A.areaName(a)} <small>${A.filtered({ area: a, cat: 'all' }).length}</small></button>`).join('');
  }
  function chipsCat() {
    const list = [['all', T('Все', 'All')], ['women', T('Для женщин', 'For women')], ['kids', T('Для детей', 'For kids')]]
      .concat(A.CATS.filter((c) => c !== 'Для детей').map((c) => [c, A.catName(c)]));
    $('catRow').innerHTML = list.map(([k, name]) => { const n = A.filtered({ cat: k }).length; return n || k === 'all' || S.cat === k ? `<button class="chip chip--sm ${S.cat === k ? 'is-on' : ''}" data-cat="${E(k)}">${E(name)} <small>${n}</small></button>` : ''; }).join('');
  }

  // ---------- карусель ----------
  let list = [], front = 0, angle = 0, target = 0, step = 60, radius = 300;
  function buildRing() {
    list = A.filtered().slice(0, 12);
    const ring = $('ring'), n = Math.max(list.length, 1);
    step = 360 / Math.max(n, 6);
    const cw = Math.min(270, Math.max(168, innerWidth * (innerWidth < 560 ? .44 : .2)));
    radius = innerWidth < 980 ? cw * 1.9 : Math.max(cw * 1.05, (cw * 1.1) / (2 * Math.tan(Math.PI / Math.max(n, 6))));
    ring.style.transform = `translateZ(${-radius}px)`;
    ring.innerHTML = list.map((e, i) => { const p = A.price(e); return `<div class="pc" data-i="${i}" style="width:${cw}px;margin:${-cw * 2 / 3}px 0 0 ${-cw / 2}px"><span class="price ${p.cls}">${E(p.text)}</span><img src="${E(A.img(e))}" alt="" ${i > 3 && i < n - 2 ? 'loading="lazy"' : ''}><div class="pc__t"><small>${E(A.dayLabel(e._d))}${e.time ? ' · ' + E(e.time) : ''}</small>${E(A.title(e))}</div></div>`; }).join('');
    $('bgs').innerHTML = list.map((e, i) => `<img src="${E(A.img(e))}" data-i="${i}" alt="" ${i ? 'loading="lazy"' : ''}>`).join('');
    angle = target = 0; front = -1;
    place(); setFront(0, true);
  }
  function place() {
    let best = 0, bestZ = -1e9;
    document.querySelectorAll('.pc').forEach((c, i) => {
      const a = i * step - angle, z = Math.cos(a * Math.PI / 180) * radius;
      c.style.transform = `rotateY(${a}deg) translateZ(${radius}px)`;
      const vis = (z + radius) / (2 * radius);
      c.style.filter = `brightness(${0.35 + vis * 0.65})`;
      c.style.zIndex = Math.round(vis * 100);
      if (z > bestZ) { bestZ = z; best = i; }
    });
    if (best !== front) setFront(best);
  }
  function setFront(i, now) {
    front = i;
    document.querySelectorAll('.pc').forEach((c) => c.classList.toggle('is-front', +c.dataset.i === i));
    document.querySelectorAll('#bgs img').forEach((im) => im.classList.toggle('is-on', +im.dataset.i === i));
    $('pos').textContent = list.length ? `${i + 1} / ${list.length}` : '0 / 0';
    const e = list[i];
    const els = ['dateBox', 'infoTitle', 'infoSum', 'infoTable', 'infoActions'].map($);
    const fill = () => {
      if (!e) { els.forEach((el) => { el.innerHTML = ''; }); els[1].textContent = T('На эти дни пока пусто. Выберите неделю или другой район.', 'Nothing here yet. Try the whole week or another area.'); return; }
      const d = e._d, p = A.price(e);
      els[0].innerHTML = `<span class="date__n">${String(d.getDate()).padStart(2, '0')}</span><span class="date__m"><b>${E(A.dayLabel(d).split(',')[0])}</b>${S.lang === 'en' ? '' : A.MON_RU[d.getMonth()]}</span>`;
      els[1].textContent = A.title(e);
      els[2].textContent = A.summary(e);
      els[3].innerHTML = [[T('Когда', 'When'), E(A.timeText(e) || T('время у организатора', 'ask the host'))], [T('Где', 'Where'), E(A.placeText(e) || T('у организатора', 'ask the host'))], [T('Тема', 'Topic'), E(A.catName(e.category || ''))], [T('Вход', 'Entry'), `<span class="price ${p.cls}">${E(p.text)}</span>`]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      els[4].innerHTML = A.buttons(e) + `<button class="btn-chat" data-detail="${e._i}">${T('Подробнее', 'Details')}</button>`;
    };
    if (now || reduce) { fill(); return; }
    els.forEach((el) => el.classList.add('is-out'));
    clearTimeout(setFront._t);
    setFront._t = setTimeout(() => { fill(); els.forEach((el) => el.classList.remove('is-out')); }, 240);
  }
  let dragging = false, moved = 0, lastX = 0, idle = 0;
  const box = $('ringBox');
  const snap = () => { target = Math.round(target / step) * step; };
  box.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; lastX = e.clientX; idle = 0; });
  addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; moved += Math.abs(dx); target -= dx * 0.35; lastX = e.clientX; });
  addEventListener('pointerup', () => { if (dragging) { dragging = false; snap(); } });
  box.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); target += e.deltaX * 0.3; idle = 0; clearTimeout(box._w); box._w = setTimeout(snap, 140); } }, { passive: false });
  $('prev').addEventListener('click', () => { snap(); target -= step; idle = 0; });
  $('next').addEventListener('click', () => { snap(); target += step; idle = 0; });
  box.addEventListener('click', (ev) => {
    if (moved > 8) return;
    const c = ev.target.closest('.pc'); if (!c || !list.length) return;
    const i = +c.dataset.i;
    if (i === front) { openDetail(list[i]._i); return; }
    const cur = ((Math.round(target / step) % list.length) + list.length) % list.length;
    let d = i - cur; if (d > list.length / 2) d -= list.length; if (d < -list.length / 2) d += list.length;
    snap(); target += d * step; idle = 0;
  });
  addEventListener('keydown', (e) => { if ($('sheet').classList.contains('is-open')) { if (e.key === 'Escape') closeSheet(); return; } if (e.key === 'ArrowRight') $('next').click(); if (e.key === 'ArrowLeft') $('prev').click(); });
  (function loop() {
    idle++;
    if (!dragging && !reduce && list.length > 1 && !document.hidden && idle > 300 && idle % 280 === 0 && box.getBoundingClientRect().bottom > 0) { snap(); target += step; }
    angle += (target - angle) * 0.08;
    if (Math.abs(target - angle) > 0.01 || dragging) place();
    requestAnimationFrame(loop);
  })();

  // ---------- неделя ----------
  function card(e) {
    const p = A.price(e);
    return `<button class="ev" data-detail="${e._i}"><div class="ev__img"><img src="${E(A.img(e))}" alt="" loading="lazy"><span class="price ${p.cls}">${E(p.text)}</span><div class="ev__time">${e.time ? `<b>${E(e.time)}</b>` : ''}${e.recurring ? `<b>${E(e.recurring)}</b>` : ''}</div></div><div class="ev__b"><span class="ev__c">${E(A.catName(e.category || ''))}</span><span class="ev__t" style="display:block">${E(A.title(e))}</span><p class="ev__p">${E(A.placeText(e) || A.timeText(e))}</p></div></button>`;
  }
  function week() {
    const days = [];
    for (let k = 0; k < 7; k++) days.push(new Date(A.today.getTime() + k * A.DAY));
    const all = A.filtered({ when: 'week' });
    const byKey = {};
    all.forEach((e) => { (byKey[e._key] = byKey[e._key] || []).push(e); });
    const wd = S.lang === 'en' ? A.WD_EN : A.WD_SHORT;
    $('days7').innerHTML = days.map((d, k) => {
      const key = A.ymd(d), items = byKey[key] || [];
      const stack = items.slice(0, 4).map((e) => `<img src="${E(A.img(e))}" alt="" loading="lazy">`).join('');
      return `<button class="d7 ${items.length ? '' : 'is-empty'}" data-jump="${key}"><small>${k === 0 ? T('сегодня', 'today') : k === 1 ? T('завтра', 'tmrw') : wd[d.getDay()]}</small><b>${d.getDate()}</b><em>${A.nEvents(items.length)}</em><span class="d7__stack">${stack}</span></button>`;
    }).join('');
    chipsCat(); chipsArea('areaRow', true);
    const st = A.stats();
    $('weekKicker').textContent = T(`Неделя · ${A.nEvents(all.length)}`, `Week · ${A.nEvents(all.length)}`);
    $('weekLead').textContent = T(`Всё, что собрали из ${st.chats} чатов острова на ближайшие 7 дней. Нажмите на карточку, чтобы открыть подробности и сообщение в Telegram.`, `Everything we collected from ${st.chats} island chats for the next 7 days. Tap a card for details and the Telegram message.`);
    const AD = `<button class="ad between" data-open="ads"><span class="ad__tag">${T('Реклама', 'Ad')}</span><span><span class="ad__t">${T('Здесь видят вас перед выходными', 'Be seen right before the weekend')}</span><span class="ad__s">${T('Место между днями афиши для бара, студии или маркета', 'A slot between days for your bar, studio or market')}</span></span><span class="btn-cta">${T('Разместить', 'Advertise')}</span></button>`;
    const groups = A.groupByDay(all);
    $('days').innerHTML = groups.map((g, i) => `<section class="day" id="d-${g.key}"><div class="day__h"><b>${E(A.dayLabel(g.date))}</b><span>${A.nEvents(g.items.length)}</span></div><div class="grid">${g.items.map(card).join('')}</div></section>${i === 0 && groups.length > 1 ? AD : ''}`).join('') ||
      `<p class="empty">${T('По этим фильтрам на неделе пусто. Снимите тему или район.', 'Nothing this week for these filters. Clear the topic or area.')}</p>`;
    reveal('#days .ev');
  }

  // ---------- бесплатно ----------
  function free() {
    const items = A.filtered({ when: 'week', free: true, cat: 'all', area: 'all' });
    $('freeN').textContent = items.length;
    $('freeStrip').innerHTML = items.slice(0, 24).map(card).join('') || `<p class="empty">${T('Бесплатных событий на неделе пока нет', 'No free events this week yet')}</p>`;
  }

  // ---------- окна ----------
  function openSheet(html) { $('sheetBody').innerHTML = html; $('sheet').classList.add('is-open'); document.body.style.overflow = 'hidden'; if (window.__lenis) window.__lenis.stop(); }
  function closeSheet() { $('sheet').classList.remove('is-open'); document.body.style.overflow = ''; if (window.__lenis) window.__lenis.start(); }
  function openDetail(i) {
    const e = A.events.find((x) => x._i === +i); if (!e) return;
    const p = A.price(e);
    openSheet(`<div class="detail"><div class="detail__img"><img src="${E(A.img(e))}" alt=""></div><div class="detail__b">
      <span class="ev__c">${E(A.catName(e.category || ''))}${e.audience.includes('женщинам') ? ' · ' + T('для женщин', 'for women') : ''}</span>
      <h3>${E(A.title(e))}</h3>
      <dl class="table"><div><dt>${T('Когда', 'When')}</dt><dd>${E(A.dayLabel(e._d))}${A.timeText(e) ? ' · ' + E(A.timeText(e)) : ''}</dd></div><div><dt>${T('Где', 'Where')}</dt><dd>${E(A.placeText(e) || T('у организатора', 'ask the host'))}</dd></div><div><dt>${T('Вход', 'Entry')}</dt><dd><span class="price ${p.cls}">${E(p.text)}</span></dd></div></dl>
      <p>${E(A.summary(e))}</p>
      <div class="actions">${A.buttons(e)}</div>
      <div class="detail__more"><a class="btn-chat" href="${A.ics(e)}" download="afisha-bali.ics">${T('В календарь', 'Add to calendar')}</a><button class="btn-chat" data-share="${e._i}">${T('Поделиться', 'Share')}</button></div>
      <p style="font-size:13px;color:var(--faint)">${T('Источник', 'Source')}: ${E(e.source_chat_title || e.source_tg_chat_url)}</p></div></div>`);
  }
  function openForm(kind) {
    const ads = kind === 'ads';
    const formats = [[T('Первая карточка дня', 'First card of the day'), T('Ваше событие первым в ленте и в карусели на выбранный день', 'Your event first in the feed and carousel on the chosen day')], [T('Слот между днями', 'Slot between days'), T('Баннер между днями недели', 'A banner between the days of the week')], [T('Куда пойти всегда', 'Always worth it'), T('Постоянное место в рубрике своего района', 'A permanent spot in your area section')]];
    openSheet(`<form class="form" id="leadForm">
      <h3>${ads ? T('Реклама в афише', 'Advertise') : T('Добавить событие', 'Add an event')}</h3>
      <p>${ads ? T('Выберите формат и оставьте контакт.', 'Pick a format and leave a contact.') : T('Расскажите, что, когда и где. Анонс из открытых чатов Бали попадает сюда и сам, в течение часа.', 'Tell us what, when and where. Announcements from public Bali chats also land here on their own within an hour.')}</p>
      ${ads ? `<div class="formats">${formats.map(([t, s]) => `<div><b>${t}</b><span style="color:var(--muted);font-size:15px">${s}</span></div>`).join('')}</div>` : `<label>${T('Что за событие', 'What')}<input id="f-what" required placeholder="${T('Джем в Чангу', 'Jam session in Canggu')}"></label><label>${T('Когда', 'When')}<input id="f-when" placeholder="${T('Пятница, 19:00', 'Friday, 7 pm')}"></label><label>${T('Где', 'Where')}<input id="f-where" placeholder="${T('Бар или район', 'Venue or area')}"></label>`}
      <label>${T('Ваш Telegram', 'Your Telegram')}<input id="f-tg" placeholder="@username"></label>
      <button class="btn-cta" type="submit">${ads ? T('Оставить заявку', 'Send request') : T('Отправить анонс', 'Send')}</button>
      <div id="formOk"></div></form>`);
    $('leadForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      $('formOk').innerHTML = `<div class="ok">${T('Приём заявок откроется вместе с ботом афиши, он уже в работе. Пока опубликуйте анонс в чате ', 'Requests open together with our bot, coming soon. Meanwhile post the announcement in ')}<a href="https://t.me/balichat_event" target="_blank" rel="noopener">t.me/balichat_event</a>${T(', и он появится здесь сам.', ' and it will show up here on its own.')}</div>`;
    });
  }
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('is-on'), 2200); }

  // ---------- события интерфейса ----------
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-close]') || t === $('sheet')) { closeSheet(); return; }
    const det = t.closest('[data-detail]'); if (det && !t.closest('a')) { openDetail(det.dataset.detail); return; }
    const op = t.closest('[data-open]'); if (op) { openForm(op.dataset.open); return; }
    const sh = t.closest('[data-share]');
    if (sh) { const e = A.events.find((x) => x._i === +sh.dataset.share); const data = { title: A.title(e), text: A.title(e) + ' · ' + A.dayLabel(e._d), url: e.source_tg_message_url }; if (navigator.share) navigator.share(data).catch(() => {}); else { try { navigator.clipboard.writeText(data.url); toast(T('Ссылка скопирована', 'Link copied')); } catch (err) {} } return; }
    const j = t.closest('[data-jump]'); if (j) { const el = $('d-' + j.dataset.jump); if (el) { if (window.__lenis) window.__lenis.scrollTo(el, { offset: -170 }); else el.scrollIntoView({ behavior: 'smooth' }); } return; }
    const b = t.closest('[data-when],[data-area],[data-cat],[data-lang-btn]');
    if (!b) return;
    if (b.dataset.when) S.when = b.dataset.when;
    if (b.dataset.area) S.area = b.dataset.area;
    if (b.dataset.cat) S.cat = b.dataset.cat;
    if (b.dataset.langBtn) A.setLang(b.dataset.langBtn);
    render();
  });
  $('freeOnly').addEventListener('change', (e) => { S.free = e.target.checked; render(); });
  addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(buildRing, 200); });

  // ---------- движение ----------
  function reveal(sel) {
    if (!window.gsap || reduce) return;
    gsap.utils.toArray(sel).forEach((el, i) => gsap.fromTo(el, { y: 30, opacity: 0.001 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out', delay: (i % 4) * .05, scrollTrigger: { trigger: el, start: 'top 95%', once: true } }));
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  if (window.gsap && window.Lenis && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const el = document.querySelector(a.getAttribute('href')); if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: -80 }); }));
  }

  // ---------- данные и обновление ----------
  function updText() {
    if (!builtAt) return;
    const d = new Date(new Date(builtAt).getTime() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    $('updText').textContent = T(`Обновлено в ${hh}:${mm} по Бали · обновляется само каждые 50 минут`, `Updated ${hh}:${mm} Bali time · refreshes every 50 minutes`);
  }
  function tagline() { const n = A.stats().today; $('tagline').innerHTML = T(`Куда пойти на Бали <em>сегодня</em> · ${A.nEvents(n)}`, `Where to go in Bali <em>today</em> · ${A.nEvents(n)}`); }
  function render() { tagline(); chipsWhen(); chipsArea('areaRowTop', false); buildRing(); week(); free(); updText(); }
  async function fetchData(first) {
    try {
      const r = await fetch('events.json?t=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      if (!first && j.meta && j.meta.updated === builtAt) return;
      builtAt = j.meta && j.meta.updated;
      A.load(j.events, j.meta);
      render();
    } catch (e) { if (first) $('infoTitle').textContent = T('Не удалось загрузить афишу. Обновите страницу.', 'Could not load events. Refresh the page.'); }
  }
  A.setLang(S.lang);
  fetchData(true);
  setInterval(() => fetchData(false), 10 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchData(false); });
})();
