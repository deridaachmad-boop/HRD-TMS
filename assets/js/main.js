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

  /* ---- loading screen "Halo, HRD!" + animasi masuk hero ---- */
  document.body.classList.add('reveal-ready');
  const reveals = document.querySelectorAll('[data-reveal]');
  let revealed = false;
  const startReveal = () => {
    if (revealed) return;
    revealed = true;
    reveals.forEach((el, i) => setTimeout(() => el.classList.add('in'), 90 * i));
  };

  const pre = document.getElementById('preloader');
  if (pre && !document.documentElement.classList.contains('no-preload')) {
    const MIN_MS = 1800;   // tampil minimal 1,8 detik sejak halaman dibuka
    const MAX_MS = 5000;   // batas aman jika ada yang lambat dimuat
    let closed = false;
    const closePre = () => {
      if (closed) return;
      closed = true;
      pre.classList.add('done');
      try { sessionStorage.setItem('hrdHello', '1'); } catch (e) {}
      setTimeout(startReveal, 250);
      setTimeout(() => pre.remove(), 800);
    };
    const onLoaded = () => setTimeout(closePre, Math.max(0, MIN_MS - performance.now()));
    if (document.readyState === 'complete') onLoaded();
    else window.addEventListener('load', onLoaded, { once: true });
    setTimeout(closePre, MAX_MS);
  } else {
    startReveal();
  }

  /* ---- data live dari Google Sheets (published CSV) ---- */
  const STATS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8rATuqH6Hm2iHW4XpAWdF83MwGumG8dDWGRm_7aIrNj5w26FhXhssiKhSVW5V04MwR3GeeFBgZ7z9/pub?gid=1107685349&single=true&output=csv';
  const TRAINING_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRaCpN0v9MKrbdGqGIXpdxxaRqKheRMIHsg2N_mUiFQwRUdbIXRLLKCNeFaFeVma1pZNZKwqhLHzRQu/pub?gid=1813580930&single=true&output=csv';
  const PELAMAR_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9EmXXiKrqqjDEXLWlkjh1T0lGUeH3MEuvvHtOV2lQMbU4ecOXmX3aC3Oqn1yu3gjRfTiggtoww02Z/pub?gid=1631684246&single=true&output=csv';
  const BIDANG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9EmXXiKrqqjDEXLWlkjh1T0lGUeH3MEuvvHtOV2lQMbU4ecOXmX3aC3Oqn1yu3gjRfTiggtoww02Z/pub?gid=1631684246&single=true&output=csv';
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
    truck: '<path d="M2 6h11v9H2zM13 9h5l3 3v3h-8"/><circle cx="6" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    health: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    hat: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 7V5"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    edu: '<path d="M2 9l10-5 10 5-10 5zM6 11.5V16c3 2 9 2 12 0v-4.5"/>',
    oil: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2M5 12h14"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
    food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M9 3v10M17 3c-2 2-2 7 0 9v9"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c3-5 6-8 10-10"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    brief: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6h6v2M3 13h18"/>'
  };
  const ICON_RULES = [
    [/minyak|gas|pupuk|migas/i, 'oil'],
    [/otomotif|kendaraan/i, 'car'],
    [/makanan|minuman|fmcg/i, 'food'],
    [/agri|pertanian|perikanan|perkebunan/i, 'leaf'],
    [/manufaktur|pabrik|industri|produksi|logam|baja/i, 'factory'],
    [/dagang|retail|ritel|toko|distribusi/i, 'cart'],
    [/logistik|transport|ekspedisi|pelayaran|kargo/i, 'truck'],
    [/teknologi|\bit\b|software|digital|telekom/i, 'chip'],
    [/kesehatan|rumah sakit|farmasi|medis|laboratorium/i, 'health'],
    [/konstruksi|kontraktor|properti|bangunan/i, 'hat'],
    [/energi|tambang|smelter|listrik|batu bara/i, 'bolt'],
    [/pendidikan|sekolah|kampus|pelatihan/i, 'edu'],
    [/jasa|pemerintah/i, 'flag']
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
      const total = rows.reduce((s, r) => s + r.n, 0);
      const max = rows[0].n;
      box.innerHTML = rows.map((r, i) => {
        const key = (ICON_RULES.find(x => x[0].test(r.name)) || [0, 'brief'])[1];
        const f = Math.max(0.05, r.n / max).toFixed(3);
        const pct = Math.round(r.n / total * 100);
        return '<div class="bar-col" style="--i:' + i + ';--f:' + f + '" title="' + esc(r.name) + ': ' + r.n + ' pelamar">' +
          '<div class="bar-fill"><span class="bar-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[key] + '</svg></span></div>' +
          '<span class="bar-label"><b>' + pct + '%</b><span class="bar-name">' + esc(r.name) + '</span></span></div>';
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

  /* ---- Training Center: record pelatihan dari Google Sheets ---- */
  const TRAINING_LOG_CSV_URL = 'GANTI-LINK-CSV-DATA-WEB-TRAINING';

  (async function loadTrainingLog() {
    const list = document.getElementById('log-list');
    if (!list) return;
    const BULAN = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
    const NAMA = BULAN.map(b => b.charAt(0).toUpperCase() + b.slice(1));
    const escL = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function parseDate(tgl, bulan, year) {
      const t = String(tgl || '').toLowerCase();
      const slash = t.match(/(\d{1,2})\/(\d{1,2})\/(20\d\d)/);          // 11/08/2026 = dd/mm/yyyy
      if (slash) return { d: +slash[1], m: +slash[2] - 1, y: +slash[3] };
      let m = BULAN.findIndex(b => t.includes(b));
      const y = (t.match(/\b(20\d\d)\b/) || [])[1];
      const day = (t.match(/\d{1,2}/) || [])[0];
      if (m >= 0) return { d: day ? +day : 0, m, y: y ? +y : year };
      m = BULAN.findIndex(b => String(bulan || '').toLowerCase().includes(b));  // tanggal kosong: pakai bulan
      return m >= 0 ? { d: 0, m, y: year } : null;
    }

    function setCount(id, target) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = '0';
      new IntersectionObserver((es, o) => {
        if (!es[0].isIntersecting) return;
        o.disconnect();
        const start = performance.now();
        const tick = now => {
          const p = Math.min(1, (now - start) / 1800);
          el.textContent = formatNumber(target * (1 - Math.pow(1 - p, 3)), 0, '');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.1 }).observe(el);
    }

    try {
      const res = await fetch(TRAINING_LOG_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = parseCSV((await res.text()).trim()).slice(1);
      const years = raw.map(r => (String(r[2] || '').match(/\b(20\d\d)\b/) || [])[1]).filter(Boolean).map(Number);
      const defYear = years.length ? Math.max(...years) : new Date().getFullYear();

      // kolom: A Materi | B Bulan | C Tanggal | D Bagian | E Peserta
      const rows = raw.map(r => ({
        materi: (r[0] || '').trim(),
        bagian: (r[3] || '').trim(),
        n: parseInt(r[4], 10) || 0,
        dt: parseDate(r[2], r[1], defYear)
      })).filter(r => r.materi && r.dt);
      if (!rows.length) throw new Error('Data kosong');

      rows.forEach(r => { r.key = r.dt.y * 100 + r.dt.m; r.sort = Date.UTC(r.dt.y, r.dt.m, r.dt.d); });
      rows.sort((a, b) => b.sort - a.sort);                      // terbaru di atas

      setCount('log-sesi', rows.length);
      setCount('log-materi', new Set(rows.map(r => r.materi.toUpperCase())).size);
      setCount('log-peserta', rows.reduce((s, r) => s + r.n, 0));

      const keys = [...new Set(rows.map(r => r.key))].sort((a, b) => a - b);
      const multiYear = new Set(rows.map(r => r.dt.y)).size > 1;
      const label = k => NAMA[k % 100] + (multiYear ? ' ' + Math.floor(k / 100) : '');
      const tabs = document.getElementById('log-tabs');
      let active = 'all';

      const render = () => {
        const shown = active === 'all' ? rows : rows.filter(r => r.key === active);
        list.innerHTML = shown.map((r, i) =>
          '<div class="log-row" style="--i:' + Math.min(i, 12) + '">' +
            '<div class="log-date"><b>' + (r.dt.d || '–') + '</b><span>' + NAMA[r.dt.m].slice(0, 3).toUpperCase() + ' ' + r.dt.y + '</span></div>' +
            '<div class="log-main"><strong>' + escL(r.materi) + '</strong><span>' + escL(r.bagian || 'Semua bagian') + '</span></div>' +
            '<div class="log-n">' + r.n + ' peserta</div>' +
          '</div>').join('');
        list.scrollTop = 0;
        tabs.querySelectorAll('.log-tab').forEach(b => b.classList.toggle('active', b.dataset.k === String(active)));
      };

      tabs.innerHTML = '<button type="button" class="log-tab" data-k="all">Semua</button>' +
        keys.map(k => '<button type="button" class="log-tab" data-k="' + k + '">' + label(k) + '</button>').join('');
      tabs.addEventListener('click', e => {
        const b = e.target.closest('.log-tab');
        if (!b) return;
        active = b.dataset.k === 'all' ? 'all' : Number(b.dataset.k);
        render();
      });
      render();
    } catch (err) {
      console.error('Gagal memuat record pelatihan:', err);
      list.innerHTML = '<p class="log-empty">Data pelatihan belum tersedia.</p>';
    }
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
