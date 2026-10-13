(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- motyw jasny / ciemny ---------- */
  const themeBtn = $('#theme');
  const setTheme = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
  };
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
    themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  }

  /* ---------- menu mobilne ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- animacje ---------- */
  const fmt = (n) => Math.round(n).toLocaleString('pl-PL');
  const stats = $$('[data-count]');
  const setFinal = () => stats.forEach((el) => { el.textContent = fmt(+el.dataset.count); });

  const hasGsap = window.gsap && window.ScrollTrigger;
  if (!hasGsap || reduce) {
    setFinal();
  } else {
    gsap.registerPlugin(ScrollTrigger);

    // płynny scroll
    if (window.Lenis) {
      const lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -64 }); }
      }));
    }

    // wejście w hero
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero .eyebrow', { y: 16, opacity: 0, duration: 0.5 })
      .from('.hero h1 .w', { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.07 }, '-=0.2')
      .from('.hero .lead', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
      .from('.hero .cta > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
      .from('.hero-art > *', { scale: 0.85, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.2);

    // pojawianie się bloków
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 36, opacity: 0, duration: 0.8, ease: 'power3.out',
        delay: +(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    // paralaksa
    $$('[data-speed]').forEach((el) => {
      gsap.to(el, {
        yPercent: +el.dataset.speed * 30, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // liczniki
    stats.forEach((el) => {
      const end = +el.dataset.count;
      const o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }),
      });
    });
  }

  /* ---------- formularz rezerwacji ---------- */
  const form = $('#booking');
  if (form && window.BIZ) {
    const dateEl = form.elements.date;
    const timeEl = form.elements.time;
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    dateEl.min = iso(now);
    const max = new Date(now); max.setDate(max.getDate() + 30);
    dateEl.max = iso(max);

    const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const fillTimes = () => {
      timeEl.innerHTML = '';
      if (!dateEl.value) { timeEl.add(new Option('Najpierw wybierz datę', '')); return; }
      const d = new Date(dateEl.value + 'T00:00');
      const wd = (d.getDay() + 6) % 7; // 0 = poniedziałek
      const h = window.BIZ.hours[wd];
      if (!h) { timeEl.add(new Option('Tego dnia zamknięte', '')); return; }
      const isToday = dateEl.value === iso(new Date());
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes() + 30;
      let any = false;
      for (let t = toMin(h[0]); t + window.BIZ.slot <= toMin(h[1]); t += window.BIZ.slot) {
        if (isToday && t < nowMin) continue;
        const label = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
        timeEl.add(new Option(label, label));
        any = true;
      }
      if (!any) timeEl.add(new Option('Brak wolnych godzin', ''));
    };
    dateEl.addEventListener('change', fillTimes);
    fillTimes();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity() || !timeEl.value) { form.reportValidity(); return; }
      const f = new FormData(form);
      const ok = $('#booking-ok');
      $('#ok-name', ok).textContent = f.get('name');
      $('#ok-when', ok).textContent = `${f.get('date')} · ${f.get('time')}`;
      $('#ok-what', ok).textContent = f.get('service');
      form.hidden = true;
      ok.hidden = false;
      ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    const again = $('#ok-again');
    if (again) again.addEventListener('click', () => {
      form.reset(); fillTimes();
      form.hidden = false; $('#booking-ok').hidden = true;
    });
  }
})();
