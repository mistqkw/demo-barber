(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('pl-PL');
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- motyw, menu, nagłówek ---------- */
  const themeBtn = $('#theme');
  themeBtn.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
  themeBtn.addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
    try { localStorage.setItem('theme', t); } catch (e) {}
  });
  const nav = $('#nav'), burger = $('#burger'), header = $('#site-header');
  burger.addEventListener('click', () => burger.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reflektor "cienia" w hero ---------- */
  const hero = $('.hero');
  if (hero && !reduce) {
    let tx = 0.62, ty = 0.38, x = tx, y = ty, active = true;
    const touch = matchMedia('(hover: none)').matches;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top) / r.height;
    });
    new IntersectionObserver(([en]) => { active = en.isIntersecting; if (active) loop(); }).observe(hero);
    const loop = () => {
      if (!active) return;
      if (touch) { const t = performance.now() / 1800; tx = 0.5 + 0.32 * Math.sin(t); ty = 0.4 + 0.2 * Math.cos(t * 0.8); }
      x += (tx - x) * 0.1; y += (ty - y) * 0.1;
      hero.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      hero.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- słowa manifestu ---------- */
  const words = $('#words');
  if (words) {
    words.innerHTML = words.textContent.trim().split(/\s+/).map((w) => `<span>${w}</span>`).join(' ');
  }

  /* ---------- animacje GSAP ---------- */
  const counters = $$('[data-count]');
  const hasGsap = window.gsap && window.ScrollTrigger;
  if (!hasGsap || reduce) {
    counters.forEach((el) => { el.textContent = fmt(+el.dataset.count); });
    $$('.words span').forEach((s) => { s.style.opacity = 1; });
    $('.slash path')?.setAttribute('stroke-dasharray', 'none');
    $('.progress span')?.style.setProperty('transform', 'scaleX(1)');
    $('.steps')?.style.setProperty('--p', 1);
  } else {
    gsap.registerPlugin(ScrollTrigger);

    if (window.Lenis) {
      const lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: id === '#top' ? 0 : -60 }); }
      }));
    }

    // wejście
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .from('.hero .badge, .hero .eyebrow', { y: 14, opacity: 0, duration: 0.6, stagger: 0.1 })
      .from('.hero h1 .w', { yPercent: 115, duration: 1.1, stagger: 0.09 }, '-=0.3')
      .from('.hero .lead', { y: 24, opacity: 0, duration: 0.7 }, '-=0.6')
      .from('.hero .cta > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.5')
      .from('.giant', { opacity: 0, xPercent: (i) => (i ? 8 : -8), duration: 1.4, stagger: 0.15 }, 0.1);

    // paralaksa gigantycznych liter
    gsap.to('.giant.g1', { xPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.giant.g2', { xPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.stripes', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // słowa zapalają się w trakcie przewijania
    gsap.to('.words span', {
      opacity: 1, stagger: 0.12, ease: 'none',
      scrollTrigger: { trigger: '.words', start: 'top 80%', end: 'bottom 45%', scrub: true },
    });

    // linia brzytwy
    const slash = $('.slash path');
    gsap.fromTo(slash, { strokeDasharray: 1, strokeDashoffset: 1 }, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.slash', start: 'top 90%', end: 'top 40%', scrub: true },
    });

    // liczniki
    counters.forEach((el) => {
      const end = +el.dataset.count, o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.5, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }) });
    });
    gsap.from('.stat', { y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.stats', start: 'top 85%', once: true } });

    // cennik: poziomy scroll z przypięciem (desktop)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const section = $('.services'), track = $('.track'), bar = $('.progress span');
      section.classList.add('h-scroll');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.pin', start: 'top top+=60', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
        },
      });
      return () => { section.classList.remove('h-scroll'); bar.style.transform = ''; };
    });
    mm.add('(max-width: 900px)', () => {
      gsap.from('.svc', { y: 40, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.track', start: 'top 85%', once: true } });
    });

    // rytuał
    ScrollTrigger.create({
      trigger: '.steps', start: 'top 70%', end: 'bottom 60%', scrub: true,
      onUpdate: (self) => $('.steps').style.setProperty('--p', self.progress.toFixed(3)),
    });
    $$('.steps li').forEach((li) => gsap.from(li, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 85%', once: true } }));

    // rezerwacja, stopka
    gsap.from('.ticket, #booking fieldset', { y: 34, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: '.book-grid', start: 'top 82%', once: true } });
    gsap.from('.wordmark', { yPercent: 40, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.wordmark', start: 'top 95%', once: true } });
  }

  /* ---------- rezerwacja: żywy bilet ---------- */
  const form = $('#booking');
  const svcChips = $('#svc-chips'), dayChips = $('#day-chips'), slotChips = $('#slot-chips');
  const ticket = $('#ticket');
  const services = $$('.svc').map((el) => ({ id: el.dataset.id, name: el.dataset.name, price: +el.dataset.price }));
  const state = { svc: null, day: null, slot: null };
  const DOW = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const MON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  // deterministyczne "zajęte" terminy, żeby demo wyglądało jak prawdziwy kalendarz
  const taken = (key) => { let h = 7; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 5 === 0; };

  const chip = (type, name, value, html, extra = '') =>
    `<label class="chip ${extra}"><input type="radio" name="${name}" value="${value}"${type === 'off' ? ' disabled' : ''}><span>${html}</span></label>`;

  svcChips.innerHTML = services.map((s) => chip('on', 'svc', s.id, `${s.name} · ${s.price} zł`)).join('');

  const slotsFor = (d) => {
    const h = window.BIZ.hours[(d.getDay() + 6) % 7];
    const out = [];
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes() + 30;
    const today = iso(d) === iso(new Date());
    for (let t = toMin(h[0]); t + window.BIZ.slot <= toMin(h[1]); t += window.BIZ.slot) {
      const label = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
      out.push({ label, off: (today && t < nowMin) || taken(iso(d) + label) });
    }
    return out;
  };

  const days = [];
  for (let i = 0, d = new Date(); days.length < 10 && i < 30; i++, d = new Date(d.getTime() + 864e5)) {
    if (window.BIZ.hours[(d.getDay() + 6) % 7] && slotsFor(d).some((x) => !x.off)) days.push(new Date(d));
  }
  dayChips.innerHTML = days.map((d) =>
    chip('on', 'day', iso(d), `<small>${DOW[d.getDay()]}</small>${d.getDate()} ${MON[d.getMonth()]}`, 'day')).join('');

  const set = (id, text, empty) => { const el = $(id); el.textContent = text; el.classList.toggle('empty', !!empty); };
  const render = () => {
    const s = services.find((x) => x.id === state.svc);
    set('#t-svc', s ? s.name : 'wybierz usługę', !s);
    set('#t-day', state.day ? state.day.label : 'wybierz dzień', !state.day);
    set('#t-slot', state.slot || 'wybierz godzinę', !state.slot);
    $('#t-price').textContent = s ? `${s.price} zł` : '—';
  };

  const pickService = (id) => {
    state.svc = id;
    const input = $(`input[name=svc][value=${id}]`);
    if (input) input.checked = true;
    render();
  };
  svcChips.addEventListener('change', (e) => pickService(e.target.value));
  dayChips.addEventListener('change', (e) => {
    const d = days.find((x) => iso(x) === e.target.value);
    state.day = { iso: e.target.value, label: `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` };
    state.slot = null;
    slotChips.innerHTML = slotsFor(d).map((s) => chip(s.off ? 'off' : 'on', 'slot', s.label, s.label)).join('');
    render();
  });
  slotChips.addEventListener('change', (e) => { state.slot = e.target.value; render(); });
  $$('.pick').forEach((b) => b.addEventListener('click', () => {
    pickService(b.closest('.svc').dataset.id);
    const target = $('#rezerwacja');
    if (window.Lenis && window.gsap) target.scrollIntoView({ behavior: 'smooth' }); else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  const msg = $('#form-msg');
  const fail = (t) => { msg.textContent = t; msg.hidden = false; };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.hidden = true;
    const f = new FormData(form);
    if (!state.svc) return fail('Wybierz usługę.');
    if (!state.day) return fail('Wybierz dzień.');
    if (!state.slot) return fail('Wybierz godzinę.');
    if (String(f.get('name')).trim().length < 2) return fail('Podaj imię.');
    if (!/^\+?[0-9 \-]{7,16}$/.test(String(f.get('phone')).trim())) return fail('Podaj poprawny numer telefonu.');
    ticket.classList.add('done');
    $('#stamp').textContent = 'potwierdzono (demo)';
    if (window.gsap && !reduce) gsap.fromTo('#stamp', { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
    ticket.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });
})();
