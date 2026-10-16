/* Thư viện dùng chung: đọc dữ liệu ATM/PGD từ Google Sheets (CSV) */
(() => {
'use strict';
const CFG = window.APP_CONFIG || {};
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();
const ls = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
/* ---------- Đọc CSV ---------- */
function parseCSV(text){
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (q){
      if (c === '"'){ if (text[i+1] === '"'){ f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ','){ row.push(f); f = ''; }
    else if (c === '\n'){ row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length){ row.push(f); rows.push(row); }
  return rows;
}
// Nhận diện cột theo tên tiêu đề (không phụ thuộc thứ tự cột)
const FIELDS = {
  code:['ma atm','ma diem','ma'], name:['ten diem dat','ten diem giao dich','ten'],
  type:['loai may','loai'], address:['dia chi'], ward:['xa/phuong','xa'], province:['tinh'],
  lat:['vi do'], lng:['kinh do'], hours:['gio hoat dong','gio lam viec','gio'],
  services:['dich vu'], photo:['link anh (google drive)','link anh','anh'],
  status:['trang thai'], pub:['cong khai'], updated:['ngay cap nhat','cap nhat'],
  phone:['dien thoai','so dien thoai','sdt']
};
function toItems(rows, kind){
  const hi = rows.findIndex(r => r.some(c => norm(c).startsWith('vi do')));
  if (hi < 0) return [];
  const head = rows[hi].map(norm), used = new Set(), col = {};
  for (const [k, cands] of Object.entries(FIELDS)){
    for (const c of cands){
      const i = head.findIndex((h, j) => !used.has(j) && (h === c || h.startsWith(c)));
      if (i >= 0){ col[k] = i; used.add(i); break; }
    }
  }
  const g = (r, k) => col[k] == null ? '' : String(r[col[k]] ?? '').trim();
  const num = v => parseFloat(String(v).replace(',', '.'));
  const out = [], seen = new Set();
  for (const r of rows.slice(hi+1)){
    const lat = num(g(r,'lat')), lng = num(g(r,'lng'));
    const name = g(r,'name'), code = g(r,'code');
    if (!(lat > 8 && lat < 24 && lng > 102 && lng < 110) || !(name || code)) continue;
    if (norm(g(r,'pub')).startsWith('khong')) continue;
    let id = code || name; while (seen.has(id)) id += '-2'; seen.add(id);
    const st = g(r,'status'), hours = g(r,'hours'), typeRaw = g(r,'type');
    out.push({
      kind, id, code, name: name || code, lat, lng,
      type: kind === 'atm' ? (/cdm/i.test(typeRaw) ? 'CDM' : 'ATM') : (typeRaw || 'Điểm giao dịch'),
      address: g(r,'address'), ward: g(r,'ward'), province: g(r,'province'),
      hours, h24: /24\s*\/\s*7|24\s*h/i.test(hours), services: g(r,'services'),
      photo: g(r,'photo'), status: st || 'Hoạt động',
      active: !st || norm(st).startsWith('hoat dong'),
      updated: g(r,'updated'), phone: g(r,'phone'),
      search: norm([name, code, g(r,'address'), g(r,'ward'), g(r,'province'), typeRaw].join(' '))
    });
  }
  return out;
}

/* ---------- Tải dữ liệu ---------- */
async function fetchText(url, bust){
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
  try {
    const u = bust ? url + (url.includes('?') ? '&' : '?') + '_=' + Date.now() : url;
    const res = await fetch(u, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(to); }
}
async function loadKind(kind){
  const url = kind === 'atm' ? CFG.ATM_CSV_URL : CFG.PGD_CSV_URL;
  const fb = kind === 'atm' ? CFG.FALLBACK_ATM : CFG.FALLBACK_PGD;
  const key = 'vtb-atm-cache-' + kind;
  // 1) Google Sheets (dữ liệu chính)
  if (url){
    try {
      const text = await fetchText(url, true);
      if (/<html/i.test(text.slice(0, 500))) throw new Error('Không phải CSV');
      const items = toItems(parseCSV(text), kind);
      ls.set(key, { t: Date.now(), text });
      return { items, t: Date.now(), cache: false, source: 'sheet' };
    } catch(e){ console.warn('Không tải được Google Sheets', kind, e); }
    // 2) Bản lưu lần trước trên máy (từ Google Sheets)
    const c = ls.get(key);
    if (c) return { items: toItems(parseCSV(c.text), kind), t: c.t, cache: true, source: 'cache' };
  }
  // 3) File dự phòng trong repo
  try {
    const text = await fetchText(fb, true);
    return { items: toItems(parseCSV(text), kind), t: Date.now(), cache: !!url, source: 'fallback' };
  } catch(e){ console.warn('Không tải được file dự phòng', kind, e); }
  return { items: [], t: null, cache: true, failed: true, source: 'none' };
}

window.VTB = { norm, ls, parseCSV, toItems, loadKind };
})();
