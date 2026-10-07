// PT TMS HRD Portal — shared behaviour

document.addEventListener('DOMContentLoaded', () => {
  /* ---- mobile nav ---- */
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  /* ---- hero reveal sequence (single orchestrated load) ---- */
  document.body.classList.add('reveal-ready');
  const reveals = document.querySelectorAll('[data-reveal]');
  reveals.forEach((el, i) => {
    setTimeout(() => el.classList.add('in'), 90 * i);
  });

  /* ---- animated stat counters (on view) ---- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const target = parseFloat(el.getAttribute('data-count'));
        const decimals = el.getAttribute('data-count').includes('.') ? 1 : 0;
        const suffix = el.getAttribute('data-suffix') || '';
        const dur = 900;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target * eased;
          el.textContent = val.toFixed(decimals).replace('.', ',') + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.15 });
    counters.forEach(c => io.observe(c));
  }

  /* ---- tabs (Training Center document library) ---- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  if (tabBtns.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target)?.classList.add('active');
      });
    });
  }

  /* ---- contact form (Hotline) — client-side only, opens mail client ---- */
  const hotlineForm = document.getElementById('hotline-form');
  if (hotlineForm) {
    hotlineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(hotlineForm);
      const subject = encodeURIComponent('Hotline HRD — ' + (data.get('topic') || 'Masukan Karyawan'));
      const anon = data.get('anon') ? 'Ya (anonim)' : 'Tidak';
      const body = encodeURIComponent(
        `Nama: ${data.get('name') || '-'}\n` +
        `Bagian/Unit: ${data.get('unit') || '-'}\n` +
        `Topik: ${data.get('topic') || '-'}\n` +
        `Anonim: ${anon}\n\n` +
        `Pesan:\n${data.get('message') || '-'}`
      );
      window.location.href = `mailto:hrd@ptTMS.co.id?subject=${subject}&body=${body}`;
    });
  }
});
