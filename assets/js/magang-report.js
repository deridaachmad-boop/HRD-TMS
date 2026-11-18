(function () {
  'use strict';
  const D = window.MAGANG;
  const root = document.getElementById('mr-root');
  if (!D || !root) return;

  const MAXM = D.maxBulan || 6, WPM = 4;
  const PROGS = D.programs || [];
  const COLORS = ['#2456d9', '#f97316', '#16a34a', '#9333ea', '#0ea5e9', '#e11d48', '#ca8a04', '#0f766e'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const hide = k => (D.sembunyikan || []).indexOf(k) > -1;
  const hasM = m => !!(D.months && D.months[m]);
  const hasW = w => !!(D.weeks && D.weeks[w]);
  const weeksOf = m => Array.from({ length: WPM }, (_, i) => (m - 1) * WPM + i + 1);
  const availW = m => weeksOf(m).filter(hasW);
  const latestM = () => { for (let m = MAXM; m >= 1; m--) if (hasM(m) || availW(m).length) return m; return 1; };

  /* ---------- potongan HTML ---------- */
  const kpis = items => '<div class="mr-kpis">' + items.map(i =>
    '<div class="mr-kpi"><span>' + esc(i[0]) + '</span><b>' + esc(i[1]) + '</b></div>').join('') + '</div>';
  const ul = a => '<ul class="mr-ul">' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const photos = f => (f && f.length) ? '<div class="mr-photos">' + f.map(u => '<img src="' + esc(u) + '" alt="Foto kegiatan" loading="lazy">').join('') + '</div>' : '';
  const table = (head, rows) => '<div class="mr-tw"><table class="mr-table"><thead><tr>' +
    head.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';

  const bars = (title, rows, alt) => '<div class="mr-chart"><h4>' + esc(title) + '</h4>' + rows.map(r =>
    '<div class="mr-bar"><span class="mr-bn">' + esc(r.name) + '</span><span class="mr-bt"><i class="mr-fill' + (alt ? ' alt' : '') +
    '" style="--w:' + Math.max(0, Math.min(100, r.v)) + '%"></i></span><b>' + esc(r.label) + '</b></div>').join('') + '</div>';

  function trend(m) {
    const ms = []; for (let k = 1; k <= MAXM; k++) if (hasM(k)) ms.push(k);
    if (ms.length < 2) {
      return '<div class="mr-chart"><h4>Tren capaian kurikulum</h4><p class="mr-hint">Grafik tren muncul setelah laporan minimal 2 bulan tersedia.</p></div>';
    }
    const W = 560, H = 230, L = 40, R = 16, T = 14, B = 34;
    const x = k => L + (k - 1) * (W - L - R) / (MAXM - 1);
    const y = v => T + (100 - v) * (H - T - B) / 100;
    let g = '';
    [0, 25, 50, 75, 100].forEach(v => {
      g += '<line class="mr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
           '<text class="mr-ax" x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    });
    for (let k = 1; k <= MAXM; k++) {
      g += '<text class="mr-ax' + (k === m ? ' on' : '') + '" x="' + x(k) + '" y="' + (H - 10) + '" text-anchor="middle">Bln ' + k + '</text>';
    }
    g += '<line class="mr-sel" x1="' + x(m) + '" x2="' + x(m) + '" y1="' + T + '" y2="' + (H - B) + '"/>';
    const leg = [];
    PROGS.forEach((p, i) => {
      const pts = ms.filter(k => D.months[k].progs && D.months[k].progs[p.key]).map(k => [k, +D.months[k].progs[p.key].kurikulum || 0]);
      if (!pts.length) return;
      const c = COLORS[i % COLORS.length];
      g += '<polyline class="mr-line" stroke="' + c + '" points="' + pts.map(q => x(q[0]) + ',' + y(q[1])).join(' ') + '"/>';
      pts.forEach(q => { g += '<circle cx="' + x(q[0]) + '" cy="' + y(q[1]) + '" r="4" fill="#fff" stroke="' + c + '" stroke-width="2.5"/>'; });
      leg.push('<span><i style="background:' + c + '"></i>' + esc(p.name) + '</span>');
    });
    return '<div class="mr-chart"><h4>Tren capaian kurikulum per bulan (%)</h4>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tren capaian kurikulum" style="width:100%;height:auto">' + g + '</svg>' +
      '<div class="mr-leg">' + leg.join('') + '</div></div>';
  }

  /* ---------- laporan bulanan ---------- */
  function monthHTML(m) {
    const d = D.months[m];
    const rows = PROGS.filter(p => d.progs && d.progs[p.key]).map(p => Object.assign({ p }, d.progs[p.key]));
    const kur = Math.round(avg(rows.map(r => +r.kurikulum || 0)));
    const nilai = Math.round(avg(rows.map(r => +r.nilai || 0)));
    let n = 0; const H = t => '<h4 class="mr-h">' + (++n) + '. ' + t + '</h4>';

    let h = '<header class="mr-head"><p class="mr-kick">LAPORAN BULANAN PESERTA MAGANGHUB</p><h3>Bulan ke-' + m +
            '</h3><p class="mr-sub">PT Timur Megah Steel · Disusun oleh: HRD</p></header>';
    if (d.ringkasan) h += '<div class="mr-sum"><strong>Ringkasan Eksekutif</strong><p>' + esc(d.ringkasan) + '</p></div>';
    h += kpis([
      ['Peserta aktif', d.peserta != null ? d.peserta : rows.length],
      ['Rata-rata kehadiran', d.kehadiran != null ? d.kehadiran + '%' : '—'],
      ['Capaian kurikulum', kur + '%'],
      ['Rata-rata nilai mentor', nilai]
    ]);

    h += H('Capaian Kurikulum &amp; Nilai Mentor per Program Studi');
    h += '<div class="mr-charts">' +
      bars('Capaian kurikulum (%)', rows.map(r => ({ name: r.p.name, v: +r.kurikulum || 0, label: (+r.kurikulum || 0) + '%' })), false) +
      bars('Nilai mentor (0-100)', rows.map(r => ({ name: r.p.name, v: +r.nilai || 0, label: String(+r.nilai || 0) })), true) +
      '</div>' + trend(m);
    h += table(['Program Studi', 'Capaian Kurikulum', 'Nilai Mentor', 'Catatan Mentor'], rows.map(r => [
      '<strong>' + esc(r.p.name) + '</strong>',
      '<span class="mr-mini"><i style="--w:' + (+r.kurikulum || 0) + '%"></i></span> ' + (+r.kurikulum || 0) + '%',
      '<strong>' + (+r.nilai || 0) + '</strong>',
      esc(r.catatan || '')
    ]));
    h += '<p class="mr-note">Nilai mentor memakai skala 0-100 dari Formulir Penilaian Magang. Capaian kurikulum dihitung dari indikator capaian bulan berjalan yang sudah terpenuhi sesuai kurikulum.</p>';

    if (d.cerita && d.cerita.length) h += H('Cerita Capaian Bulan Ini') + ul(d.cerita);
    h += photos(d.foto);
    if (d.kendala && d.kendala.length) h += H('Kendala &amp; Tindak Lanjut') + ul(d.kendala);
    if (!hide('pipeline') && d.pipeline && d.pipeline.length) {
      h += H('Rekomendasi Talent Pipeline') + table(['Peserta', 'Program Studi', 'Rekomendasi', 'Alasan Singkat'], d.pipeline.map(r => [
        '<strong>' + esc(r.peserta) + '</strong>', esc(r.prodi), '<span class="mr-rec">' + esc(r.rek) + '</span>', esc(r.alasan)
      ])) + '<p class="mr-note">Rekomendasi bersifat sementara dan akan dievaluasi ulang pada laporan bulan berikutnya.</p>';
    }
    if (d.rencana && d.rencana.length) h += H('Rencana Bulan Depan') + ul(d.rencana);
    return h;
  }

  /* ---------- laporan mingguan ---------- */
  function weekHTML(w) {
    const d = D.weeks[w], mo = Math.ceil(w / WPM);
    const rows = PROGS.filter(p => d.progs && d.progs[p.key]).map(p => {
      const r = d.progs[p.key], mt = String(r.hadir || '').match(/(\d+)\s*\/\s*(\d+)/);
      return { p, st: String(r.status || '').toLowerCase(), hadir: r.hadir || '-', got: mt ? +mt[1] : 0, tot: mt ? +mt[2] : 0, kegiatan: r.kegiatan || '' };
    });
    const got = rows.reduce((s, r) => s + r.got, 0), tot = rows.reduce((s, r) => s + r.tot, 0);
    const okN = rows.filter(r => r.st === 'hijau').length;
    const kend = d.kendala || [];
    const gmN = kend.filter(k => /^ya/i.test(String(k.gm || ''))).length;
    let n = 0; const H = t => '<h4 class="mr-h">' + (++n) + '. ' + t + '</h4>';

    let h = '<header class="mr-head"><p class="mr-kick">LAPORAN MINGGUAN PESERTA MAGANGHUB</p><h3>Minggu ke-' + w +
            '</h3><p class="mr-sub">Bulan ke-' + mo + ' · PT Timur Megah Steel · Disusun oleh: HRD</p></header>';
    const k = [
      ['Peserta aktif', d.peserta != null ? d.peserta : rows.length],
      ['Kehadiran minggu ini', tot ? Math.round(got / tot * 100) + '%' : '—'],
      ['Program sesuai rencana', okN + ' dari ' + rows.length]
    ];
    if (!hide('gm')) k.push(['Butuh keputusan GM', gmN]);
    h += kpis(k);

    h += H('Status per Program Studi');
    h += bars('Kehadiran per program studi (hari)', rows.map(r => ({ name: r.p.name, v: r.tot ? r.got / r.tot * 100 : 0, label: r.hadir })), false);
    h += table(['Program Studi', 'Status', 'Hadir (hari)', 'Kegiatan Minggu Ini'], rows.map(r => [
      '<strong>' + esc(r.p.name) + '</strong>',
      '<span class="mr-st ' + esc(r.st) + '">' + esc(r.st ? r.st.charAt(0).toUpperCase() + r.st.slice(1) : '-') + '</span>',
      esc(r.hadir), esc(r.kegiatan)
    ]));
    h += '<p class="mr-note">Hijau = sesuai rencana · Kuning = ada hambatan ringan · Merah = perlu tindakan segera</p>';

    if (d.highlight && d.highlight.length) h += H('Highlight Minggu Ini') + ul(d.highlight);
    h += photos(d.foto);
    if (kend.length) {
      const head = ['Kendala / Permintaan', 'Usulan Tindak Lanjut']; if (!hide('gm')) head.push('Butuh Keputusan GM?');
      h += H('Kendala &amp; Hal yang Butuh Keputusan') + table(head, kend.map(r => {
        const row = [esc(r.kendala), esc(r.usulan)]; if (!hide('gm')) row.push('<strong>' + esc(r.gm) + '</strong>'); return row;
      }));
    }
    return h;
  }

  /* ---------- unduh: laporan A4 lewat dialog cetak (Simpan sebagai PDF) ---------- */
  const PRINT_CSS = [
    '@page{size:A4;margin:14mm 13mm 16mm;@bottom-center{content:"Halaman " counter(page);font-size:9pt;color:#64748b}}',
    'html,body{background:#fff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    'body{margin:0;padding:0}',
    '.mr-doc{border:0 !important;box-shadow:none !important;border-radius:0 !important;padding:0 !important;animation:none !important}',
    '.mr-fill{animation:none !important}',
    '.mr-charts{grid-template-columns:1fr !important}',
    '.mr-kpi b{background:none !important;-webkit-text-fill-color:#1e3a8a !important;color:#1e3a8a !important}',
    '.mr-chart,.mr-tw,.mr-kpis,.mr-sum,.mr-photos,tr{break-inside:avoid;page-break-inside:avoid}',
    '.mr-h{break-after:avoid}',
    '.mr-foot{margin-top:22px;padding-top:10px;border-top:1px solid #cbd5e1;font-size:10pt;color:#64748b}'
  ].join('\n');

  function download(kind, num) {
    const body = kind === 'bulan' ? monthHTML(num) : weekHTML(num);
    const title = kind === 'bulan' ? 'Laporan-Bulanan-MagangHub-Bulan-' + num : 'Laporan-Mingguan-MagangHub-Minggu-' + num;
    const css = new URL('assets/css/style.css', document.baseURI).href;
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
    f.srcdoc = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>' + title + '</title>' +
      '<link rel="stylesheet" href="' + css + '"><style>' + PRINT_CSS + '</style></head><body>' +
      (D.contoh ? '<p class="mr-demo">CONTOH LAPORAN — data ilustrasi, bukan data sebenarnya</p>' : '') +
      '<main class="mr-doc">' + body + '</main>' +
      '<footer class="mr-foot">PT Timur Megah Steel — Laporan Peserta MagangHub</footer></body></html>';
    f.onload = async () => {
      try { await f.contentWindow.document.fonts.ready; } catch (e) {}
      setTimeout(() => {
        const old = document.title; document.title = title;
        const done = () => { document.title = old; setTimeout(() => f.remove(), 500); };
        f.contentWindow.addEventListener('afterprint', done, { once: true });
        f.contentWindow.focus();
        f.contentWindow.print();
        setTimeout(() => { if (document.body.contains(f)) done(); }, 60000);
      }, 300);
    };
    document.body.appendChild(f);
  }

  /* ---------- tampilan interaktif ---------- */
  const state = { m: latestM(), mode: 'bulan', w: null };
  function fix() {
    const wk = availW(state.m);
    if (state.mode === 'bulan' && !hasM(state.m) && wk.length) state.mode = 'minggu';
    if (state.mode === 'minggu' && !wk.length && hasM(state.m)) state.mode = 'bulan';
    if (state.mode === 'minggu' && wk.indexOf(state.w) < 0) state.w = wk.length ? wk[wk.length - 1] : null;
  }

  function render(focusSel) {
    fix();
    const m = state.m, wk = availW(m);
    const chip = (attr, val, label, on, off) => '<button type="button" class="mr-chip' + (on ? ' on' : '') + '" ' + attr + '="' + val + '"' +
      (off ? ' disabled title="Belum ada laporan"' : '') + ' aria-pressed="' + (on ? 'true' : 'false') + '">' + label + '</button>';

    let months = '';
    for (let k = 1; k <= MAXM; k++) months += chip('data-m', k, 'Bulan ' + k, k === m, !(hasM(k) || availW(k).length));

    let row2 = chip('data-mode', 'bulan', 'Laporan bulanan', state.mode === 'bulan', !hasM(m)) +
               chip('data-mode', 'minggu', 'Laporan mingguan', state.mode === 'minggu', !wk.length);
    if (state.mode === 'minggu') weeksOf(m).forEach(w => { row2 += chip('data-w', w, 'Minggu ke-' + w, w === state.w, !hasW(w)); });

    let doc = '<p class="mr-empty">Belum ada laporan untuk bulan ini.</p>', dl = '';
    if (state.mode === 'bulan' && hasM(m)) { doc = monthHTML(m); dl = 'data-dl="bulan" data-n="' + m + '"'; }
    else if (state.mode === 'minggu' && state.w) { doc = weekHTML(state.w); dl = 'data-dl="minggu" data-n="' + state.w + '"'; }

    root.innerHTML =
      '<div class="mr-ctl"><div class="mr-chips" role="group" aria-label="Pilih bulan program">' + months + '</div>' +
      '<div class="mr-chips">' + row2 +
      (dl ? '<button type="button" class="btn btn-primary mr-dl" ' + dl + '>' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg> Unduh laporan (PDF)</button>' : '') +
      '</div></div>' +
      (D.contoh ? '<p class="mr-demo">CONTOH LAPORAN — data ilustrasi, bukan data sebenarnya</p>' : '') +
      '<article class="mr-doc">' + doc + '</article>' +
      (dl ? '<p class="mr-hint">Pada dialog cetak yang muncul, pilih <b>Simpan sebagai PDF</b> sebagai printer.</p>' : '');

    if (focusSel) { const el = root.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.m) { state.m = +b.dataset.m; render('[data-m="' + state.m + '"]'); }
    else if (b.dataset.mode) { state.mode = b.dataset.mode; render('[data-mode="' + state.mode + '"]'); }
    else if (b.dataset.w) { state.w = +b.dataset.w; render('[data-w="' + state.w + '"]'); }
    else if (b.dataset.dl) { download(b.dataset.dl, +b.dataset.n); }
  });

  render();
})();
