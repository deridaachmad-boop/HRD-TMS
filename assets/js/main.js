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

  /* ---- data live dari Google Sheets (published CSV) ---- */
  const STATS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rATuqH6Hm2iHW4XpAWdF83MwGumG8dDWGRm_7aIrNj5w26FhXhssiKhSVW5V04MwR3GeeFBgZ7z9/pub?gid=1107685349&single=true&output=csv';
  const TRAINING_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRaCpN0v9MKrbdGqGIXpdxxaRqKheRMIHsg2N_mUiFQwRUdbIXRLLKCNeFaFeVma1pZNZKwqhLHzRQu/pub?gid=1813580930&single=true&output=csv';
  const PELAMAR_CSV_URL = 'GANTI-LINK-CSV-TAB-RINGKASAN';
  const BIDANG_CSV_URL = 'GANTI-LINK-CSV-TAB-BIDANG-USAHA';
  const REFRESH_MS = 60000; // cek ulang data tiap 60 detik

  // Pembaca CSV yang benar: paham sel berkutip seperti "0,56"
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cell += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell); cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else {
        cell += ch;
      }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  async function fetchSheetRow(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = parseCSV((await res.text()).trim());
    const headers = rows[0].map(h => h.trim());
    const values = rows[1] || [];
    const data = {};
    headers.forEach((h, i) => { if (h) data[h] = (values[i] || '').trim(); });
    return data;
  }

  function formatNumber(num, decimals, suffix) {
    return num.toFixed(decimals).replace('.', ',') + suffix;
  }

  // Isi elemen yang punya atribut `attr` (data-sheet / data-quarter) dari sheet
  async function loadSheet(url, attr) {
    const els = document.querySelectorAll('[' + attr + ']');
    try {
      const data = await fetchSheetRow(url);
      els.forEach(el => {
        const suffix = el.getAttribute('data-suffix') || '';
        const raw = (data[el.getAttribute(attr)] || '').replace('%', '').trim();
        const num = parseFloat(raw.replace(',', '.'));
        if (raw === '' || isNaN(num)) {
          el.textContent = '—';
          el.removeAttribute('data-count');
          el.dataset.done = '1';
          return;
        }
        const decimals = (raw.split(/[.,]/)[1] || '').length; // "0,56" -> 2, "83" -> 0
        el.setAttribute('data-count', num);
        el.setAttribute('data-decimals', decimals);
        if (el.dataset.done) {
          el.textContent = formatNumber(num, decimals, suffix); // animasi sudah selesai: langsung ganti angka
        } else {
          el.textContent = '0' + suffix;
        }
      });
    } catch (err) {
      console.error('Gagal memuat data dari Google Sheets:', err);
      els.forEach(el => {
        if (el.dataset.done) return; // angka yang sudah tampil dibiarkan
        el.textContent = '—';
        el.removeAttribute('data-count');
        el.dataset.done = '1';
      });
    }
  }

  // Animasi hitung naik saat elemen terlihat di layar
  function startCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const attr = el.getAttribute('data-count');
        const target = parseFloat(attr);
        const decimals = el.hasAttribute('data-decimals')
          ? parseInt(el.getAttribute('data-decimals'), 10)
          : (attr.split('.')[1] || '').length;
        const suffix = el.getAttribute('data-suffix') || '';
        const dur = 4000;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = formatNumber(target * eased, decimals, suffix);
          if (p < 1) requestAnimationFrame(tick);
          else el.dataset.done = '1';
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });
    counters.forEach(c => io.observe(c));
  }

  (async function initStats() {
    // hanya ambil sheet yang memang dipakai di halaman ini
    const sources = [
      { url: STATS_CSV_URL, attr: 'data-quarter' },
      { url: TRAINING_CSV_URL, attr: 'data-sheet' },
      { url: PELAMAR_CSV_URL, attr: 'data-pelamar' }
    ].filter(s => document.querySelector('[' + s.attr + ']'));

      /* ---- grafik bidang usaha pelamar non-fresh graduate ---- */
  const ICONS = {
    factory: '<path d="M3 21V11l6 4v-4l6 4V7h3v14H3z"/>',
    cart: '<path d="M3 4h2l2.4 10h9.2L19 7H6"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
    truck: '<path d="M2 6h11v9H2zM13 9h5l3 3v3h-8"/><circle cx="6" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    health: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    hat: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 7V5"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    edu: '<path d="M2 9l10-5 10 5-10 5zM6 11.5V16c3 2 9 2 12 0v-4.5"/>',
    brief: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6h6v2M3 13h18"/>'
  };
  const ICON_RULES = [
    [/manufaktur|pabrik|industri|produksi|logam|baja/i, 'factory'],
    [/dagang|retail|ritel|toko|distribusi/i, 'cart'],
    [/keuangan|bank|asuransi|finans|leasing/i, 'bank'],
    [/logistik|transport|ekspedisi|pelayaran|kargo/i, 'truck'],
    [/teknologi|\bit\b|software|digital|telekom/i, 'chip'],
    [/kesehatan|rumah sakit|farmasi|medis/i, 'health'],
    [/konstruksi|kontraktor|properti|bangunan/i, 'hat'],
    [/energi|tambang|migas|listrik|batu bara/i, 'bolt'],
    [/pendidikan|sekolah|kampus|pelatihan/i, 'edu']
  ];
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  (async function loadBidangChart() {
    const box = document.getElementById('bidang-chart');
    if (!box) return;
    try {
      const res = await fetch(BIDANG_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = parseCSV((await res.text()).trim()).slice(1)
        .map(r => ({ name: (r[0] || '').trim(), n: parseFloat((r[1] || '').replace(',', '.')) }))
        .filter(r => r.name && !isNaN(r.n) && r.n > 0)
        .sort((a, b) => b.n - a.n);
      if (!rows.length) throw new Error('Data kosong');
      if (rows.length > 8) {                       // gabungkan sisanya jadi "Lainnya"
        const rest = rows.splice(7).reduce((s, r) => s + r.n, 0);
        rows.push({ name: 'Lainnya', n: rest });
      }
      const total = rows.reduce((s, r) => s + r.n, 0);
      const max = Math.max(...rows.map(r => r.n));
      box.innerHTML = rows.map((r, i) => {
        const key = (ICON_RULES.find(x => x[0].test(r.name)) || [0, 'brief'])[1];
        const h = Math.max(8, Math.round(r.n / max * 100));
        const pct = Math.round(r.n / total * 100);
        return '<div class="bar-col" style="--i:' + i + ';--h:' + h + '%">' +
          '<div class="bar-fill"><span class="bar-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[key] + '</svg></span></div>' +
          '<span class="bar-label">' + esc(r.name) + '<b>' + pct + '%</b></span></div>';
      }).join('');
      new IntersectionObserver((entries, io) => {
        if (entries[0].isIntersecting) { box.classList.add('in'); io.disconnect(); }
      }, { threshold: 0.25 }).observe(box);
    } catch (err) {
      console.error('Gagal memuat grafik bidang usaha:', err);
      box.innerHTML = '<p class="chart-empty">Data grafik belum tersedia.</p>';
    }
  })();
    
    await Promise.all(sources.map(s => loadSheet(s.url, s.attr)));
    startCounters();

    // update berkala selama halaman terbuka
    if (sources.length) {
      setInterval(() => {
        if (document.hidden) return; // jangan fetch kalau tab sedang tidak dilihat
        sources.forEach(s => loadSheet(s.url, s.attr));
      }, REFRESH_MS);
    }
  })();

  /* ---- ticker: perbanyak isi otomatis supaya selalu memenuhi lebar layar ---- */
  const ticker = document.querySelector('.ticker');
  if (ticker) {
    const baseHTML = ticker.innerHTML;
    const buildTicker = () => {
      ticker.innerHTML = baseHTML;                 // mulai dari isi asli di HTML
      const setWidth = ticker.scrollWidth;         // lebar satu set quote
      if (!setWidth) return;
      const copies = Math.ceil(window.innerWidth / setWidth) + 1;
      ticker.innerHTML = baseHTML.repeat(copies * 2);   // kelipatan genap untuk loop mulus
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildTicker);
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildTicker, 250);
    });
  }
  
    /* ---- K3: angka indikator live dari Google Sheets (published CSV) ---- */
  const K3_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvda3YSXQp_-4bHncAqp-fBCWhRlypuAQDNIPHLmRoZE_lJWvZeHQUtMUpYtDbnA/pub?gid=959271243&single=true&output=csv';

  (async function loadK3Metrics() {
    const targets = document.querySelectorAll('[data-metric]');
    if (!targets.length) return;

    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const toNum = s => {
      const m = String(s || '').trim().match(/^-?\d+([.,]\d+)?/);
      return m ? parseFloat(m[0].replace(',', '.')) : null;
    };

    const parseCSV = text => {
      const rows = [];
      let row = [], cell = '', quoted = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
          if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
          else if (ch === '"') quoted = false;
          else cell += ch;
        } else if (ch === '"') {
          quoted = true;
        } else if (ch === ',') {
          row.push(cell); cell = '';
        } else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && text[i + 1] === '\n') i++;
          row.push(cell); rows.push(row); row = []; cell = '';
        } else {
          cell += ch;
        }
      }
      row.push(cell); rows.push(row);
      return rows;
    };

    /* cari label, ambil angka di sebelah kanannya atau di bawahnya */
    const findValue = (grid, key) => {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (norm(grid[r][c]) !== key) continue;
          for (let cc = c + 1; cc < grid[r].length; cc++) {
            const n = toNum(grid[r][cc]);
            if (n !== null) return n;
          }
          if (grid[r + 1]) {
            const n = toNum(grid[r + 1][c]);
            if (n !== null) return n;
          }
        }
      }
      return null;
    };

    let grid = [];
    try {
      const res = await fetch(K3_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      grid = parseCSV(await res.text());
    } catch (err) {
      console.error('Gagal memuat data K3 dari Google Sheets:', err);
    }

    const values = new Map();
    targets.forEach(el => {
      const label = el.getAttribute('data-metric');
      const n = findValue(grid, norm(label));
      if (n === null) {
        console.warn('Data K3 tidak ditemukan untuk "' + label + '". Isi sheet yang terbaca:', grid.flat().filter(Boolean));
        el.textContent = '—';
      } else {
        values.set(el, n);
      }
    });

    /* animasi hitung naik saat kartu terlihat */
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const target = values.get(el);
        const decimals = Number.isInteger(target) ? 0 : 1;
        const dur = 2000;
        const start = performance.now();
        const tick = now => {
          const p = Math.min(1, (now - start) / dur);
          const val = target * (1 - Math.pow(1 - p, 3));
          el.textContent = val.toFixed(decimals).replace('.', ',');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    values.forEach((n, el) => { el.textContent = '0'; io.observe(el); });
  })();
  
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

  /* ---- galeri foto: slider geser (scroll-snap) + tombol + titik ---- */
  const slider = document.getElementById('gallery-slider');
  if (slider) {
    const slides = slider.querySelectorAll('.slide');
    const dotsBox = document.querySelector('.slider-dots');
    const prev = document.querySelector('.slider-btn.prev');
    const next = document.querySelector('.slider-btn.next');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function current() { return Math.round(slider.scrollLeft / slider.clientWidth); }
    function goTo(i) {
      const n = Math.max(0, Math.min(slides.length - 1, i));
      slider.scrollTo({ left: n * slider.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    }

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Ke foto ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsBox.appendChild(dot);
    });
    const dots = dotsBox.querySelectorAll('button');

    function update() {
      const i = current();
      dots.forEach((d, k) => d.classList.toggle('active', k === i));
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    }

    prev.addEventListener('click', () => goTo(current() - 1));
    next.addEventListener('click', () => goTo(current() + 1));
    slider.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
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
