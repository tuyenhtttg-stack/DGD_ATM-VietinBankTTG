/* =========================================================
   Bản đồ ATM VietinBank – Chi nhánh Tây Tiền Giang
   Dữ liệu: Google Sheets (Xuất bản lên web dạng CSV)
   Bản đồ: Leaflet + OpenStreetMap | Dẫn đường: Google Maps
   ========================================================= */
(() => {
'use strict';
const CFG = window.APP_CONFIG || {};
const $ = s => document.querySelector(s);
const root = document.documentElement;

/* ---------- Icon SVG ---------- */
const I = {
  atm:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
  pgd:'<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-6 10 6"/></svg>',
  nav:'<svg viewBox="0 0 24 24"><path d="M3 11 21 3l-8 18-2-8-8-2z"/></svg>',
  share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  qr:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h7v-4"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/></svg>',
  phone:'<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  route:'<svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/></svg>',
  locate:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></svg>',
  image:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  dl:'<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
};

/* ---------- Tiện ích ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const { norm, ls, loadKind } = window.VTB;
const pad = n => String(n).padStart(2,'0');
const fmtDateTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; };
const fmtDist = m => m == null ? '' : m < 1000 ? `${Math.max(10, Math.round(m/10)*10)} m` : `${(m/1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
function haversine(a, b){
  const R = 6371000, r = x => x*Math.PI/180;
  const dLat = r(b.lat-a.lat), dLng = r(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
let toastTimer;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const baseUrl = () => location.origin + location.pathname.replace(/index\.html$/,'');
const deepLink = it => `${baseUrl()}?${it.kind}=${encodeURIComponent(it.id)}`;
const dirUrl = it => `https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}` +
  `&travelmode=${encodeURIComponent(CFG.TRAVEL_MODE || 'driving')}&dir_action=navigate`;
const viewUrl = it => `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`;

/* ---------- Ảnh: link Google Drive / URL / file trong assets/anh ---------- */
function photoSrc(v){
  v = (v || '').trim(); if (!v) return null;
  const m = v.match(/\/d\/([\w-]{20,})/) || v.match(/[?&]id=([\w-]{20,})/);
  if (m) return { src:`https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`, alt:`https://lh3.googleusercontent.com/d/${m[1]}=w1000` };
  if (/^https?:\/\//i.test(v)) return { src:v };
  const f = /\.(jpe?g|png|webp)$/i.test(v) ? v : v + '.jpg';
  return { src:'assets/anh/' + encodeURIComponent(f) };
}

/* ---------- Trạng thái ---------- */
const S = {
  tab: 'atm', q: '', f: { cdm:false, h24:false, active:false },
  atm: [], pgd: [], me: null, loc: 'idle', sel: null,
  loadedAt: null, fromCache: false, failed: false, firstFix: true, booted: false
};

/* ---------- Bản đồ ---------- */
const map = L.map('map', { zoomControl: false, attributionControl: true, tap: true })
  .setView(CFG.MAP_CENTER || [10.38, 106], CFG.MAP_ZOOM || 11);
map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
}).addTo(map);
const layer = L.layerGroup().addTo(map);
let meMarker = null, meCircle = null;

function pinIcon(it, near, sel, count = 1){
  const cls = ['pin', it.kind === 'pgd' ? 'pgd' : (it.active ? '' : 'off'), it.type === 'CDM' && count < 2 ? 'cdm' : '', near ? 'near' : '', sel ? 'sel' : ''].join(' ');
  const badge = count > 1 ? `<span class="pin-cnt" title="${count} máy tại cùng vị trí">${count}</span>` : '';
  return L.divIcon({ className: 'pin-wrap', html: `<div class="pin-box"><div class="${cls}">${it.kind === 'pgd' ? I.pgd : I.atm}</div>${badge}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 40] });
}
// Các điểm cách nhau dưới 30 m được xem là cùng vị trí (VD: 2 máy tại 1 PGD)
const SAME_SPOT_M = 30;
const sameSpot = (a, b) => haversine(a, b) < SAME_SPOT_M;
const isDesk = () => matchMedia('(min-width:900px)').matches;
function pads(){
  const tb = $('#topbar').getBoundingClientRect();
  if (isDesk()) return { paddingTopLeft: [tb.right + 30, 30], paddingBottomRight: [40, 40] };
  return { paddingTopLeft: [30, tb.bottom + 24], paddingBottomRight: [30, sheet.vis + 30] };
}
function fitItems(list, maxZoom = 15){
  if (!list.length) return;
  const b = L.latLngBounds(list.map(p => [p.lat, p.lng]));
  map.fitBounds(b, { ...pads(), maxZoom, animate: S.booted });
}
function focusItem(it, zoom = 16){
  map.flyToBounds(L.latLngBounds([[it.lat, it.lng], [it.lat, it.lng]]), { ...pads(), maxZoom: zoom, duration: .6 });
}

/* ---------- Bảng trượt (mobile) ---------- */
const sheetEl = $('#sheet'), body = $('#sheetBody');
const sheet = {
  vis: 240, state: 'peek',
  h(){ return sheetEl.offsetHeight; },
  snaps(){ const H = innerHeight; return { peek: Math.round(Math.min(300, H*.4)), half: Math.round(H*.56), full: this.h() }; },
  set(v, animate = true){
    if (isDesk()){ this.vis = 0; root.style.setProperty('--sheet-vis', '0px'); return; }
    sheetEl.classList.toggle('dragging', !animate);
    this.vis = Math.round(v);
    sheetEl.style.transform = `translateY(${this.h() - this.vis}px)`;
    root.style.setProperty('--sheet-vis', this.vis + 'px');
  },
  to(state){ this.state = state; this.set(this.snaps()[state]); }
};
(function dragSheet(){
  let d = null;
  sheetEl.addEventListener('touchstart', e => {
    if (isDesk()) return;
    d = { y0: e.touches[0].clientY, v0: sheet.vis, on: false, t0: Date.now(), y: e.touches[0].clientY };
  }, { passive: true });
  sheetEl.addEventListener('touchmove', e => {
    if (!d) return;
    const y = e.touches[0].clientY, dy = y - d.y0;
    if (!d.on){
      if (Math.abs(dy) < 6) return;
      const full = sheet.vis >= sheet.snaps().full - 2;
      if (e.target.closest('.sheet-head') || !full || (body.scrollTop <= 0 && dy > 0)) d.on = true;
      else { d = null; return; }
    }
    e.preventDefault();
    d.y = y;
    sheet.set(Math.max(110, Math.min(sheet.snaps().full, d.v0 - dy)), false);
  }, { passive: false });
  const end = () => {
    if (!d) return;
    if (d.on){
      const v = (d.y0 - d.y) / Math.max(1, Date.now() - d.t0); // px/ms, dương = kéo lên
      const s = sheet.snaps(), cur = sheet.vis;
      let target;
      if (v > .5) target = cur < s.half ? 'half' : 'full';
      else if (v < -.5) target = cur > s.half ? 'half' : 'peek';
      else target = Object.entries(s).sort((a, b) => Math.abs(a[1]-cur) - Math.abs(b[1]-cur))[0][0];
      sheet.to(target);
    }
    d = null;
  };
  sheetEl.addEventListener('touchend', end);
  sheetEl.addEventListener('touchcancel', end);
  $('#sheetHead').addEventListener('click', () => sheet.to(sheet.state === 'peek' ? 'half' : sheet.state === 'half' ? 'full' : 'peek'));
})();

/* ---------- Lọc, sắp xếp ---------- */
function visible(){
  let list = S[S.tab];
  if (S.q){ const q = norm(S.q); list = list.filter(it => it.search.includes(q)); }
  if (S.tab === 'atm'){
    if (S.f.cdm) list = list.filter(it => it.type === 'CDM');
    if (S.f.h24) list = list.filter(it => it.h24);
    if (S.f.active) list = list.filter(it => it.active);
  }
  list = list.map(it => ({ it, d: S.me ? haversine(S.me, it) : null }));
  list.sort((a, b) => S.me ? a.d - b.d : a.it.name.localeCompare(b.it.name, 'vi'));
  return list;
}
const nearestOf = list => S.me ? (list.find(x => x.it.active) || null) : null;

/* ---------- Giao diện danh sách ---------- */
function tagsHTML(it, d, near){
  const t = [];
  if (near) t.push('<span class="tag near">Gần bạn nhất</span>');
  if (d != null) t.push(`<span class="dist">${fmtDist(d)}</span>`);
  if (it.kind === 'atm') t.push(`<span class="tag blue">${it.type === 'CDM' ? 'CDM · Nạp tiền' : 'ATM'}</span>`);
  if (it.h24) t.push('<span class="tag">24/7</span>');
  t.push(`<span class="tag ${it.active ? 'ok' : 'bad'}">${esc(it.status)}</span>`);
  return t.join('');
}
function footHTML(){
  const note = S.source === 'cache' ? ' (bản lưu trên máy – chưa kết nối được máy chủ dữ liệu)'
    : S.source === 'fallback' && CFG.ATM_CSV_URL ? ' (dữ liệu dự phòng)' : '';
  const when = S.loadedAt ? `Dữ liệu cập nhật lúc ${fmtDateTime(S.loadedAt)}${note}` : '';
  const tel = s => s.replace(/[^\d+]/g, '');
  return `<div class="foot">
    ${when ? `<div>${when}</div>` : ''}
    <a class="hot" href="tel:${tel(CFG.HOTLINE || '1900558868')}">${I.phone}Hotline ${esc(CFG.HOTLINE || '1900 558 868')}</a>
    ${CFG.BRANCH_PHONE ? `<div><a href="tel:${tel(CFG.BRANCH_PHONE)}">Chi nhánh: ${esc(CFG.BRANCH_PHONE)}</a></div>` : ''}
    <div><a href="https://${esc(CFG.WEBSITE || 'www.vietinbank.vn')}" target="_blank" rel="noopener">${esc(CFG.WEBSITE || 'www.vietinbank.vn')}</a></div>
    ${installHTML()}
    <div class="strip"></div>
  </div>`;
}
let installEvt = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function installHTML(){
  if (isStandalone) return '';
  if (installEvt) return `<div class="install"><button class="btn btn-ghost btn-sm" data-act="install">${I.dl}Cài ứng dụng lên màn hình chính</button></div>`;
  if (isIOS) return `<div class="install">Cài lên iPhone: bấm nút Chia sẻ của Safari → “Thêm vào MH chính”</div>`;
  return '';
}

function renderList(){
  const list = visible(), near = nearestOf(list);
  const isAtm = S.tab === 'atm';
  let h = '';
  if (S.me && near){
    const it = near.it;
    h += `<div class="hero">
      <span class="hero-badge"><i></i>${isAtm ? 'ATM gần bạn nhất' : 'Điểm giao dịch gần bạn nhất'}</span>
      <div class="hero-name">${esc(it.name)}</div>
      <div class="hero-addr">${esc(it.address)}</div>
      <div class="hero-meta"><span>Cách bạn <b>${fmtDist(near.d)}</b></span>${it.hours ? `<span>${esc(it.hours)}</span>` : ''}${isAtm ? `<span>${it.type === 'CDM' ? 'Rút & nạp tiền' : 'Rút tiền'}</span>` : ''}</div>
      <div class="hero-actions">
        <a class="btn btn-primary btn-block" href="${dirUrl(it)}" target="_blank" rel="noopener">${I.nav}Chỉ đường</a>
        <button class="btn btn-ghost" data-open="${esc(it.kind)}|${esc(it.id)}">Chi tiết</button>
      </div>
    </div>`;
  } else if (S.loc !== 'ok'){
    const msg = S.loc === 'denied' ? 'Bạn đã tắt quyền vị trí. Bật lại trong cài đặt trình duyệt để tìm điểm gần nhất.'
      : S.loc === 'unsupported' ? 'Thiết bị không hỗ trợ định vị.'
      : S.loc === 'pending' ? 'Đang xác định vị trí của bạn…'
      : 'Bật định vị để tìm điểm gần bạn nhất.';
    h += `<div class="notice">${I.locate}<span>${msg}</span>${S.loc !== 'pending' && S.loc !== 'unsupported' ? '<button class="btn btn-primary btn-sm" data-act="locate">Bật vị trí</button>' : ''}</div>`;
  }
  const title = isAtm ? (S.me ? 'ATM quanh bạn' : 'Mạng lưới ATM') : 'Điểm giao dịch';
  h += `<div class="list-head"><h2>${title}</h2><span class="count">${list.length} điểm</span></div>`;
  if (!list.length){
    const all = S[S.tab].length;
    h += `<div class="empty">${S.failed && !all ? 'Chưa tải được dữ liệu. Vui lòng kiểm tra kết nối mạng.'
      : !all ? (isAtm ? 'Chưa có dữ liệu ATM.' : 'Thông tin điểm giao dịch đang được cập nhật.')
      : 'Không tìm thấy kết quả phù hợp.'}</div>`;
  } else {
    h += '<ul class="items">' + list.map(({ it, d }) => {
      const ico = it.kind === 'pgd' ? 'pgd' : (it.active ? '' : 'off') + (it.type === 'CDM' ? ' cdm' : '');
      return `<li class="item" data-open="${esc(it.kind)}|${esc(it.id)}">
        <div class="item-ico ${ico}">${it.kind === 'pgd' ? I.pgd : I.atm}</div>
        <div class="item-main">
          <div class="item-name"><span>${esc(it.name)}</span></div>
          <div class="item-addr">${esc(it.address || it.ward)}</div>
          <div class="item-meta">${tagsHTML(it, d, near && near.it === it)}</div>
        </div>
        <a class="go" href="${dirUrl(it)}" target="_blank" rel="noopener" aria-label="Chỉ đường đến ${esc(it.name)}">${I.nav}</a>
      </li>`;
    }).join('') + '</ul>';
  }
  h += footHTML();
  $('#listView').innerHTML = h;
  renderMarkers(list, near);
}
function renderMarkers(list, near){
  layer.clearLayers();
  // Gộp các máy cùng vị trí thành 1 ghim có số lượng
  const groups = [];
  for (const { it } of list){
    const g = groups.find(g => sameSpot(g[0], it));
    g ? g.push(it) : groups.push([it]);
  }
  for (const g of groups){
    const nearIt = near && g.includes(near.it) ? near.it : null;
    const lead = g.includes(S.sel) ? S.sel : nearIt || g.find(x => x.active) || g[0];
    const m = L.marker([lead.lat, lead.lng], {
      icon: pinIcon(lead, !!nearIt, g.includes(S.sel), g.length),
      zIndexOffset: g.includes(S.sel) ? 1000 : nearIt ? 500 : lead.active ? 100 : 0,
      title: g.length > 1 ? `${lead.name} (${g.length} máy)` : lead.name, keyboard: true
    });
    m.on('click', () => openDetail(lead));
    layer.addLayer(m);
  }
}

/* ---------- Chi tiết ---------- */
// Các máy khác đặt cùng vị trí: cho phép chuyển nhanh giữa các máy
function sameHTML(it){
  const g = S[it.kind].filter(x => sameSpot(x, it));
  if (g.length < 2) return '';
  return `<div class="same">
    <div class="same-t">${it.kind === 'pgd' ? 'Cùng vị trí' : `Tại điểm này có ${g.length} máy`}</div>
    <div class="same-list">${g.map(x => `<button class="same-i${x === it ? ' on' : ''}" data-swap="${esc(x.kind)}|${esc(x.id)}">
      <b>${esc(x.kind === 'atm' ? (x.type === 'CDM' ? 'CDM · Nạp tiền' : 'ATM') : x.type)}</b><span>${esc(x.code || x.name)}</span>
      <i class="${x.active ? 'ok' : 'bad'}"></i></button>`).join('')}</div>
  </div>`;
}
function openDetail(it, push = true){
  S.sel = it;
  const d = S.me ? haversine(S.me, it) : null;
  const ph = photoSrc(it.photo);
  const svc = it.services ? it.services.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
  $('#detailView').innerHTML = `
    <div class="d-top">
      <button class="icon-btn" data-act="back" aria-label="Quay lại">${I.back}</button>
      <span class="grow"></span>
    </div>
    <div class="photo">
      ${ph ? `<img src="${esc(ph.src)}" ${ph.alt ? `data-alt="${esc(ph.alt)}"` : ''} alt="Ảnh ${esc(it.name)}" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <div class="ph" ${ph ? 'hidden' : ''}><div>${I.image}Hình ảnh đang được cập nhật</div></div>
    </div>
    <div class="d-tags">${tagsHTML(it, null, false)}</div>
    <h2 class="d-name">${esc(it.name)}</h2>
    ${it.code && it.code !== it.name ? `<div class="d-code">Mã điểm: ${esc(it.code)}</div>` : ''}
    ${sameHTML(it)}
    <div class="d-actions">
      <a class="btn btn-primary btn-block" href="${dirUrl(it)}" target="_blank" rel="noopener">${I.nav}Chỉ đường${d != null ? ` · ${fmtDist(d)}` : ''}</a>
    </div>
    <div class="d-sub">
      <button class="btn btn-ghost" data-act="share">${I.share}Chia sẻ</button>
      <button class="btn btn-ghost" data-act="qr">${I.qr}Mã QR</button>
      <a class="btn btn-ghost" href="${viewUrl(it)}" target="_blank" rel="noopener">${I.map}Google Maps</a>
    </div>
    <div class="rows">
      <div class="row">${I.pin}<div><div class="k">Địa chỉ</div><div class="v">${esc([it.address, it.ward && !it.address.includes(it.ward) ? it.ward : ''].filter(Boolean).join(', ') || '—')}</div></div></div>
      ${it.hours ? `<div class="row">${I.clock}<div><div class="k">${it.kind === 'pgd' ? 'Giờ làm việc' : 'Giờ hoạt động'}</div><div class="v">${esc(it.hours)}</div></div></div>` : ''}
      ${svc.length ? `<div class="row">${I.check}<div><div class="k">Dịch vụ</div><div class="svc">${svc.map(s => `<span class="tag blue">${esc(s)}</span>`).join('')}</div></div></div>` : ''}
      ${it.phone ? `<div class="row">${I.phone}<div><div class="k">Điện thoại</div><div class="v"><a href="tel:${esc(it.phone.replace(/[^\d+]/g,''))}">${esc(it.phone)}</a></div></div></div>` : ''}
      ${d != null ? `<div class="row">${I.route}<div><div class="k">Khoảng cách (đường chim bay)</div><div class="v">${fmtDist(d)}</div></div></div>` : ''}
      ${it.updated ? `<div class="row">${I.cal}<div><div class="k">Cập nhật thông tin</div><div class="v">${esc(it.updated)}</div></div></div>` : ''}
    </div>
    ${footHTML()}`;
  const img = $('#detailView .photo img');
  if (img) img.addEventListener('error', () => {
    if (img.dataset.alt){ img.src = img.dataset.alt; delete img.dataset.alt; }
    else { img.remove(); $('#detailView .ph').hidden = false; }
  });
  $('#listView').hidden = true; $('#detailView').hidden = false; body.scrollTop = 0;
  if (push) history.pushState({ d: 1 }, '', `?${it.kind}=${encodeURIComponent(it.id)}`);
  if (sheet.state === 'peek') sheet.to('half');
  renderMarkers(visible(), nearestOf(visible()));
  focusItem(it);
}
function closeDetail(fromPop = false){
  if ($('#detailView').hidden) return;
  S.sel = null;
  $('#detailView').hidden = true; $('#listView').hidden = false;
  if (!fromPop) history.replaceState(null, '', baseUrl());
  renderList();
}
addEventListener('popstate', () => closeDetail(true));

/* ---------- Chia sẻ & QR ---------- */
async function share(it){
  const url = deepLink(it), text = `${it.name} – ${it.address}`;
  if (navigator.share){ try { await navigator.share({ title: it.name, text, url }); } catch(e){} return; }
  try { await navigator.clipboard.writeText(url); toast('Đã sao chép liên kết'); }
  catch(e){ prompt('Sao chép liên kết:', url); }
}
function makeQR(text){ const q = qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make(); return q; }
function showQR(it){
  const q = makeQR(deepLink(it));
  $('#qrTitle').textContent = it.name;
  $('#qrBox').innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  $('#qrDownload').onclick = () => downloadQR(it, q);
  $('#qrDialog').showModal();
}
function downloadQR(it, q){
  const n = q.getModuleCount(), cell = 14, m = 48, w = n*cell + m*2, h = w + 120;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#0C2A44';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(m + k*cell, m + r*cell, cell, cell);
  x.textAlign = 'center'; x.fillStyle = '#005993'; x.font = 'bold 26px sans-serif';
  x.fillText(it.name.length > 40 ? it.name.slice(0, 39) + '…' : it.name, w/2, w + 20);
  x.fillStyle = '#5D6F82'; x.font = '20px sans-serif';
  x.fillText('Quét mã để chỉ đường – VietinBank Tây Tiền Giang', w/2, w + 58);
  const g = x.createLinearGradient(0, 0, w, 0);
  [['0','#1BA9E1'],['.48','#0A7FB8'],['.58','#005993'],['.76','#8B3A5E'],['.9','#D71249'],['1','#C21F2C']].forEach(([o, col]) => g.addColorStop(+o, col));
  x.fillStyle = g; x.fillRect(0, h - 12, w, 12);
  const a = document.createElement('a'); a.download = `QR_${it.id}.png`; a.href = c.toDataURL('image/png'); a.click();
}

/* ---------- Định vị ---------- */
let watchId = null;
function setMe(p){
  S.me = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
  const ll = [S.me.lat, S.me.lng];
  if (!meMarker){
    meCircle = L.circle(ll, { radius: S.me.acc, color: '#1A73E8', weight: 1, opacity: .4, fillOpacity: .1, interactive: false }).addTo(map);
    meMarker = L.marker(ll, { icon: L.divIcon({ className: 'pin-wrap', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000, interactive: false }).addTo(map);
  } else { meMarker.setLatLng(ll); meCircle.setLatLng(ll).setRadius(S.me.acc); }
}
function locate(manual){
  const fab = $('#locateBtn');
  if (!('geolocation' in navigator)){ S.loc = 'unsupported'; renderList(); if (manual) toast('Thiết bị không hỗ trợ định vị'); return; }
  if (S.me && manual && S.loc === 'ok'){ fitMeNearest(); return; }
  fab.classList.add('loading'); if (S.loc !== 'ok'){ S.loc = 'pending'; if ($('#detailView').hidden) renderList(); }
  navigator.geolocation.getCurrentPosition(p => {
    fab.classList.remove('loading'); fab.classList.add('active');
    setMe(p); S.loc = 'ok';
    if ($('#detailView').hidden) renderList();
    if (manual) fitMeNearest(); else if (S.firstFix && $('#detailView').hidden) fitAll();
    S.firstFix = false;
    if (watchId == null) watchId = navigator.geolocation.watchPosition(q => {
      const moved = haversine(S.me, { lat: q.coords.latitude, lng: q.coords.longitude });
      setMe(q); if (moved > 50 && $('#detailView').hidden) renderList();
    }, () => {}, { enableHighAccuracy: true, maximumAge: 30000 });
  }, err => {
    fab.classList.remove('loading');
    S.loc = err.code === 1 ? 'denied' : 'error';
    if ($('#detailView').hidden) renderList();
    if (manual) toast(err.code === 1 ? 'Bạn chưa cho phép truy cập vị trí' : 'Không xác định được vị trí, vui lòng thử lại');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
// Hiện toàn bộ điểm của tab hiện tại (kèm vị trí khách nếu ở gần địa bàn)
function fitAll(){
  const list = visible(), pts = list.map(x => x.it);
  if (!pts.length){ if (S.me) map.flyTo([S.me.lat, S.me.lng], 13); return; }
  if (S.me && list[0].d != null && list[0].d < 60000) pts.push(S.me);
  fitItems(pts, 15);
}
function fitMeNearest(){
  if (!S.me) return;
  const near = nearestOf(visible());
  if (near && near.d < 60000) fitItems([S.me, near.it], 16);
  else map.flyTo([S.me.lat, S.me.lng], 14);
}

/* ---------- Sự kiện ---------- */
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o && !e.target.closest('a')){
    const [k, id] = o.dataset.open.split('|');
    const it = S[k].find(x => x.id === id); if (it) openDetail(it);
    return;
  }
  const sw = e.target.closest('[data-swap]');
  if (sw){
    const [k, id] = sw.dataset.swap.split('|');
    const it = S[k].find(x => x.id === id);
    if (it && it !== S.sel){ history.replaceState(history.state, '', `?${k}=${encodeURIComponent(id)}`); openDetail(it, false); }
    return;
  }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'back') history.state && history.state.d ? history.back() : closeDetail();
  else if (act === 'locate') locate(true);
  else if (act === 'share' && S.sel) share(S.sel);
  else if (act === 'qr' && S.sel) showQR(S.sel);
  else if (act === 'install' && installEvt){ installEvt.prompt(); installEvt = null; }
});
$('#locateBtn').addEventListener('click', () => locate(true));
const qIn = $('#q');
qIn.addEventListener('input', () => {
  S.q = qIn.value; $('#qClear').hidden = !S.q;
  if (!$('#detailView').hidden) closeDetail();
  renderList();
});
qIn.addEventListener('focus', () => { if (!isDesk() && sheet.state === 'peek') sheet.to('half'); });
qIn.addEventListener('keydown', e => { if (e.key === 'Enter'){ qIn.blur(); fitItems(visible().map(x => x.it)); } });
$('#qClear').addEventListener('click', () => { qIn.value = ''; qIn.dispatchEvent(new Event('input')); qIn.focus(); });
document.querySelectorAll('.seg [data-tab]').forEach(b => b.addEventListener('click', () => {
  S.tab = b.dataset.tab;
  document.querySelectorAll('.seg [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.chip').forEach(c => c.hidden = S.tab !== 'atm');
  closeDetail(); renderList();
  const list = visible().map(x => x.it);
  fitAll();
}));
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  const k = c.dataset.filter; S.f[k] = !S.f[k]; c.setAttribute('aria-pressed', S.f[k]);
  closeDetail(); renderList();
}));
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if ($('#detailView').hidden) renderList(); });
let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { measureTop(); sheet.to(sheet.state); map.invalidateSize(); }, 120); });
function measureTop(){ root.style.setProperty('--top-h', $('#topbar').getBoundingClientRect().bottom + 'px'); }

/* ---------- Khởi động ---------- */
async function refresh(initial){
  const [a, p] = await Promise.all([loadKind('atm'), loadKind('pgd')]);
  const selKey = S.sel && [S.sel.kind, S.sel.id];
  S.atm = a.items; S.pgd = p.items;
  S.loadedAt = a.t; S.fromCache = a.cache; S.failed = !!a.failed; S.source = a.source;
  if (selKey){ const it = S[selKey[0]].find(x => x.id === selKey[1]); if (it) S.sel = it; }
  if ($('#detailView').hidden) renderList(); else if (S.sel) openDetail(S.sel, false);
  if (initial){
    const qs = new URLSearchParams(location.search);
    const k = qs.has('pgd') ? 'pgd' : qs.has('atm') ? 'atm' : null;
    const it = k && S[k].find(x => x.id === qs.get(k));
    if (it){
      if (k === 'pgd') document.querySelector('.seg [data-tab="pgd"]').click();
      history.replaceState(null, '', baseUrl());
      openDetail(it);
    } else fitItems(S.atm);
  }
}
function boot(){
  $('#appTitle').textContent = CFG.APP_TITLE || 'Tìm ATM VietinBank';
  $('#branchName').textContent = 'Mạng lưới ATM · Điểm giao dịch';
  const logo = $('#logo');
  logo.onerror = () => { logo.hidden = true; $('#logoText').hidden = false; };
  logo.src = CFG.LOGO || 'assets/logo.png';
  measureTop();
  sheet.to('peek');
  renderList();
  refresh(true).then(() => { S.booted = true; locate(false); });
  const mins = Math.max(1, +CFG.REFRESH_MINUTES || 5);
  setInterval(() => { if (!document.hidden) refresh(false); }, mins*60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (S.loadedAt || 0) > 60000) refresh(false); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
})();
