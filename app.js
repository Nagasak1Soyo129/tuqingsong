// ============================================================
// 图轻松 —— 图片工具箱:压缩 / 转格式 / 加水印 / 调整尺寸 / 旋转 / 裁剪 / 调色 / 拼图 / 转PDF / 转Base64
// 纯前端处理,图片不出浏览器,无服务器成本
// 变现:免费版 = 单张 + 质量上限 80% + 拼图锁定
//       支持者 = 批量 + 高清(质量 100%)+ 拼图
// 支持状态绑定账号(注册/登录),感谢码激活后跨设备生效
// ============================================================

const state = {
  files: [],                                                   // 原始 File 列表
  token: localStorage.getItem('tqs_token') || '',              // 登录 token
  user: null,                                                  // { username, email, premium, admin }
  premium: false,
  view: 'compress',                                            // 当前工具
  rotate: 0,                                                   // 0/90/180/270
  flipH: false,
  flipV: false,
  crop: null,                                                  // { nx, ny, nw, nh } 归一化(0~1)
  filter: { bright: 0, contrast: 100, saturate: 100, gray: false, sepia: false, invert: false },
};

// ---- DOM 引用 ----
const $ = (sel) => document.querySelector(sel);

// 转义后再拼进 innerHTML(文件名/备注等来自外部,防止被当成 HTML 执行)
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
const dropZone = $('#dropZone');
const fileInput = $('#fileInput');
const dropIcon = $('#dropIcon');
const dropText = $('#dropText');
const dropHint = $('#dropHint');
const fileBar = $('#fileBar');
const fileCount = $('#fileCount');
const thumbList = $('#thumbList');
const clearBtn = $('#clearBtn');
const previewModal = $('#previewModal');
const closePreview = $('#closePreview');
const previewClose = $('#previewClose');
const previewImg = $('#previewImg');
const previewName = $('#previewName');
const previewMeta = $('#previewMeta');
const results = $('#results');
const resultList = $('#resultList');
const countEl = $('#count');
const zipBtn = $('#zipBtn');

// 压缩
const quality = $('#quality');
const qualityVal = $('#qualityVal');
const targetKB = $('#targetKB');
const compressFormat = $('#compressFormat');
// 转格式
const formatSel = $('#format');
const convertQuality = $('#convertQuality');
const convertQualityVal = $('#convertQualityVal');
// 加水印
const wmText = $('#wmText');
const wmPos = $('#wmPos');
// 调整尺寸
const resizeW = $('#resizeW');
const resizeH = $('#resizeH');
const resizeLock = $('#resizeLock');
// 旋转
const rotateStatus = $('#rotateStatus');
const rotateReset = $('#rotateReset');
// 裁剪
const cropStatus = $('#cropStatus');
const cropBtn = $('#cropBtn');
const cropClear = $('#cropClear');
// 调色
const bright = $('#bright');
const contrast = $('#contrast');
const saturate = $('#saturate');
const brightVal = $('#brightVal');
const contrastVal = $('#contrastVal');
const satVal = $('#satVal');
const filterReset = $('#filterReset');
// 拼图
const collageLayout = $('#collageLayout');
const collageGap = $('#collageGap');
const collageLock = $('#collageLock');
const collageUpgrade = $('#collageUpgrade');
// PDF 合并 / 拆分
const mergeName = $('#mergeName');
const pdfmergeLock = $('#pdfmergeLock');
const pdfmergeUpgrade = $('#pdfmergeUpgrade');
const splitInfo = $('#splitInfo');
const splitMode = $('#splitMode');
const splitRange = $('#splitRange');
const splitRangeField = $('#splitRangeField');
const pdfsplitLock = $('#pdfsplitLock');
const pdfsplitUpgrade = $('#pdfsplitUpgrade');
// PDF 水印
const pdfwmType = $('#pdfwmType');
const pdfwmTextField = $('#pdfwmTextField');
const pdfwmImageField = $('#pdfwmImageField');
const pdfwmText = $('#pdfwmText');
const pdfwmImage = $('#pdfwmImage');
const pdfwmLayout = $('#pdfwmLayout');
const pdfwmSizeField = $('#pdfwmSizeField');
const pdfwmSize = $('#pdfwmSize');
const pdfwmSizeVal = $('#pdfwmSizeVal');
const pdfwmOpacity = $('#pdfwmOpacity');
const pdfwmOpacityVal = $('#pdfwmOpacityVal');
const pdfwmAngleField = $('#pdfwmAngleField');
const pdfwmAngle = $('#pdfwmAngle');
const pdfwmAngleVal = $('#pdfwmAngleVal');
const pdfwmColorField = $('#pdfwmColorField');
const pdfwmColor = $('#pdfwmColor');
const pdfwmScale = $('#pdfwmScale');
const pdfwmScaleVal = $('#pdfwmScaleVal');
const pdfwmPages = $('#pdfwmPages');
// PDF 页码
const pgnumInfo = $('#pgnumInfo');
const pgnumFormat = $('#pgnumFormat');
const pgnumPos = $('#pgnumPos');
const pgnumStart = $('#pgnumStart');
const pgnumSize = $('#pgnumSize');
const pgnumSizeVal = $('#pgnumSizeVal');
const pgnumColor = $('#pgnumColor');
const pgnumSkipFirst = $('#pgnumSkipFirst');
// PDF 页面管理
const pagesInfo = $('#pagesInfo');
const pagesReset = $('#pagesReset');
const pagesInsert = $('#pagesInsert');
const pageGrid = $('#pageGrid');
const pagesSummary = $('#pagesSummary');
// PDF 盖章
const stampImageInput = $('#stampImageInput');
const stampPos = $('#stampPos');
const stampScale = $('#stampScale');
const stampScaleVal = $('#stampScaleVal');
const stampOpacity = $('#stampOpacity');
const stampOpacityVal = $('#stampOpacityVal');
const stampMargin = $('#stampMargin');
const stampMarginVal = $('#stampMarginVal');
const stampPages = $('#stampPages');
// Base64
const b64Result = $('#b64Result');
const b64Text = $('#b64Text');
const b64Copy = $('#b64Copy');
const b64Download = $('#b64Download');
const b64Len = $('#b64Len');

const accountBtn = $('#accountBtn');
const upgradeBtn = $('#upgradeBtn');
const upgradeModal = $('#upgradeModal');
const closeModal = $('#closeModal');
const codeInput = $('#codeInput');
const activateBtn = $('#activateBtn');
const activateMsg = $('#activateMsg');

const loginModal = $('#loginModal');
const closeLogin = $('#closeLogin');
const loginTitle = $('#loginTitle');
const tabLogin = $('#tabLogin');
const tabRegister = $('#tabRegister');
const authUser = $('#authUser');
const authEmail = $('#authEmail');
const authPass = $('#authPass');
const authSubmit = $('#authSubmit');
const authMsgEl = $('#authMsg');

const cropModal = $('#cropModal');
const closeCrop = $('#closeCrop');
const cropCanvas = $('#cropCanvas');
const cropApply = $('#cropApply');
const cropCancel = $('#cropCancel');

const adminBtn = $('#adminBtn');
const adminModal = $('#adminModal');
const closeAdmin = $('#closeAdmin');
const genCount = $('#genCount');
const genNote = $('#genNote');
const genBtn = $('#genBtn');
const genResult = $('#genResult');
const codeList = $('#codeList');
const adminMsgEl = $('#adminMsg');

// ============================================================
// 账号系统(注册/登录,后端校验,支持状态存服务器)
// ============================================================
const TOKEN_KEY = 'tqs_token';
let authMode = 'login'; // 'login' | 'register'

function isPremium() {
  return !!(state.user && state.user.premium);
}
function isAdmin() {
  return !!(state.user && state.user.admin);
}
function refreshAuthUI() {
  state.premium = isPremium();
  const u = state.user;
  if (u) {
    if (u.admin) accountBtn.textContent = `👑 ${u.username}`;
    else if (u.premium) accountBtn.textContent = `👤 ${u.username} · 支持者`;
    else accountBtn.textContent = `👤 ${u.username}`;
    upgradeBtn.textContent = u.premium ? '感谢支持' : '请支持我们';
    upgradeBtn.style.background = u.premium ? 'linear-gradient(135deg, var(--ok), #2bb673)' : '';
  } else {
    accountBtn.textContent = '登录';
    upgradeBtn.textContent = '请支持我们';
    upgradeBtn.style.background = '';
  }
  adminBtn.hidden = !isAdmin();
  updateCollageLock();
}

function setAuthMode(mode) {
  authMode = mode;
  loginTitle.textContent = mode === 'login' ? '登录' : '注册';
  authSubmit.textContent = mode === 'login' ? '登录' : '注册';
  tabLogin.classList.toggle('active', mode === 'login');
  tabRegister.classList.toggle('active', mode === 'register');
  authEmail.hidden = mode !== 'register';
  authUser.placeholder = mode === 'login' ? '用户名 / 邮箱' : '用户名';
  authMsg('');
}
function authMsg(text, ok) {
  authMsgEl.textContent = text || '';
  authMsgEl.className = 'activate-msg' + (text ? (ok ? ' ok' : ' err') : '');
}

async function authSubmitHandler() {
  const username = authUser.value.trim();
  const password = authPass.value;
  if (!username) { authMsg(authMode === 'login' ? '请输入用户名/邮箱' : '请输入用户名', false); return; }
  if (authMode === 'register') {
    const email = authEmail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { authMsg('请输入正确的邮箱地址', false); return; }
  }
  if (password.length < 6) { authMsg('密码至少 6 位', false); return; }
  authSubmit.disabled = true;
  try {
    const body = { username, password };
    if (authMode === 'register') body.email = authEmail.value.trim();
    const res = await fetch('/api/' + (authMode === 'login' ? 'login' : 'register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      authMsg(authMode === 'login' ? '✅ 登录成功' : '✅ 注册成功', true);
      refreshAuthUI();
      setTimeout(() => { loginModal.hidden = true; authPass.value = ''; authEmail.value = ''; authMsg(''); }, 600);
    } else {
      authMsg('❌ ' + (data.msg || '操作失败'), false);
    }
  } catch (e) {
    authMsg('❌ 网络错误,请稍后重试', false);
  } finally {
    authSubmit.disabled = false;
  }
}

async function logout() {
  if (!confirm('确定退出登录?')) return;
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + state.token },
    });
  } catch (e) {}
  state.token = '';
  state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  refreshAuthUI();
}

// 感谢码:需登录,激活后写入账号(支持状态跨设备)
async function activateCode() {
  if (!state.user) {
    showMsg('请先登录账号', false);
    setAuthMode('login');
    loginModal.hidden = false;
    return;
  }
  const code = codeInput.value.trim();
  if (!code) { showMsg('请输入激活码', false); return; }
  activateBtn.disabled = true;
  try {
    const res = await fetch('/api/activate?code=' + encodeURIComponent(code), {
      headers: { Authorization: 'Bearer ' + state.token },
    });
    const data = await res.json();
    if (data.ok) {
      if (data.user) state.user = data.user;
      showMsg(data.admin ? '👑 主控激活成功(管理员模式)' : '✅ 激活成功,感谢你的支持!', true);
      refreshAuthUI();
    } else {
      showMsg('❌ ' + (data.msg || '激活码无效'), false);
    }
  } catch (e) {
    showMsg('❌ 网络错误,请稍后重试', false);
  } finally {
    activateBtn.disabled = false;
  }
}
function showMsg(text, ok) {
  activateMsg.textContent = text;
  activateMsg.className = 'activate-msg ' + (ok ? 'ok' : 'err');
}

// ============================================================
// 轻量统计(自建,不依赖第三方)
// 只记「来源」和「用了哪个工具」,不收集 IP、不写 Cookie、不存个人信息。
// 限额提醒:Cloudflare KV 免费额度是 1000 次写/天,即每天最多记约 1000 个事件。
// ============================================================
function track(kind, tool) {
  try {
    let uv = false;
    if (kind === 'pv') {
      // 一次会话只算一个新访客,避免每次刷新都多记一个
      uv = !sessionStorage.getItem('tqs_sess');
      if (uv) sessionStorage.setItem('tqs_sess', '1');
    }
    const payload = JSON.stringify({
      kind,
      tool: tool || '',
      ref: document.referrer || '',
      uv,
    });
    // sendBeacon 在页面关闭时也能可靠送出;不支持时退回 fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) { /* 统计失败绝不影响正常使用 */ }
}

async function loadStats() {
  const box = document.getElementById('statsBox');
  if (!box) return;
  box.innerHTML = '<p class="muted">加载中…</p>';
  try {
    const res = await fetch('/api/admin/stats', { headers: { Authorization: 'Bearer ' + state.token } });
    const data = await res.json();
    if (!data.ok) { box.innerHTML = '<p class="muted">' + esc(data.msg || '加载失败') + '</p>'; return; }
    const t = data.total || { pv: 0, uv: 0 };
    if (!t.pv) { box.innerHTML = '<p class="muted">还没有访问数据</p>'; return; }

    const bars = (list, unit) => list.slice(0, 8).map((x) => {
      const pct = Math.round((x.count / (list[0].count || 1)) * 100);
      return `<div class="stat-row">
        <span class="stat-name">${esc(x.name)}</span>
        <span class="stat-bar"><i style="width:${pct}%"></i></span>
        <span class="stat-num">${x.count}${unit}</span>
      </div>`;
    }).join('');

    box.innerHTML = `
      <div class="stat-total">
        <div><b>${t.pv}</b><span>总浏览</span></div>
        <div><b>${t.uv}</b><span>独立访客</span></div>
        <div><b>${(data.days || []).length}</b><span>有数据天数</span></div>
      </div>
      ${data.refs.length ? `<h4 class="stat-h">访客来源</h4>${bars(data.refs, '')}` : ''}
      ${data.tools.length ? `<h4 class="stat-h">工具使用</h4>${bars(data.tools, '')}` : ''}
      ${(data.days || []).length ? `<h4 class="stat-h">最近几天</h4>${data.days.slice(0, 7).map((d) =>
        `<div class="stat-row"><span class="stat-name">${esc(d.day)}</span><span class="stat-bar"><i style="width:${Math.round((d.pv / ((data.days[0] && data.days[0].pv) || 1)) * 100)}%"></i></span><span class="stat-num">${d.pv} 浏览 / ${d.uv} 人</span></div>`
      ).join('')}` : ''}
      <p class="stat-note">自建统计,用 Cloudflare KV 记录。不收集 IP、不写 Cookie。限额约 1000 次写/天。</p>
    `;
  } catch (e) {
    box.innerHTML = '<p class="muted">网络错误</p>';
  }
}

// ============================================================
// 发码后台(仅管理员)
// ============================================================
function adminMsg(text, ok) {
  adminMsgEl.textContent = text || '';
  adminMsgEl.className = 'activate-msg' + (text ? (ok ? ' ok' : ' err') : '');
}

async function loadCodes() {
  try {
    const res = await fetch('/api/admin/codes', { headers: { Authorization: 'Bearer ' + state.token } });
    const data = await res.json();
    if (!data.ok) { adminMsg('❌ ' + (data.msg || '加载失败'), false); return; }
    renderCodeList(data.codes || []);
  } catch (e) {
    adminMsg('❌ 网络错误', false);
  }
}

function renderCodeList(codes) {
  if (!codes.length) {
    codeList.innerHTML = '<p class="muted">还没有生成过激活码</p>';
    return;
  }
  codeList.innerHTML = codes.map((c) => `
    <div class="code-row ${c.usedBy ? 'used' : ''}">
      <span class="code-text">${esc(c.code)}</span>
      <span class="code-meta">${c.usedBy ? '已用 · ' + esc(c.usedBy) : '未使用'}${c.note ? ' · ' + esc(c.note) : ''}</span>
    </div>
  `).join('');
}

async function generateCodes() {
  const count = parseInt(genCount.value, 10) || 1;
  const note = genNote.value.trim();
  genBtn.disabled = true;
  adminMsg('');
  try {
    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token },
      body: JSON.stringify({ count, note }),
    });
    const data = await res.json();
    if (data.ok) {
      genResult.innerHTML = (data.codes || []).map((c) =>
        `<div class="gen-code"><code>${c}</code><button class="btn-copy" data-code="${c}">复制</button></div>`
      ).join('');
      genResult.querySelectorAll('.btn-copy').forEach((b) => {
        b.addEventListener('click', () => {
          navigator.clipboard.writeText(b.dataset.code).then(() => {
            b.textContent = '已复制';
            setTimeout(() => { b.textContent = '复制'; }, 1200);
          });
        });
      });
      adminMsg('✅ 已生成 ' + data.codes.length + ' 个激活码', true);
      genNote.value = '';
      loadCodes();
    } else {
      adminMsg('❌ ' + (data.msg || '生成失败'), false);
    }
  } catch (e) {
    adminMsg('❌ 网络错误', false);
  } finally {
    genBtn.disabled = false;
  }
}

// ============================================================
// PDF 支持(pdf-lib 自托管在 /vendor/,按需懒加载,不拖慢主页面)
// ============================================================
const PDF_TOOLS = ['pdfmerge', 'pdfsplit', 'pdfwatermark', 'pdfpagenum', 'pdfpages', 'pdfstamp'];

function isPdfTool(view) { return PDF_TOOLS.includes(view); }

function isPdfFile(f) {
  return f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
}

let pdfLibPromise = null;
function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdf-lib.min.js';
      s.onload = () => (window.PDFLib ? resolve(window.PDFLib) : reject(new Error('PDF 库加载失败')));
      s.onerror = () => { pdfLibPromise = null; reject(new Error('PDF 库加载失败,请检查网络')); };
      document.head.appendChild(s);
    });
  }
  return pdfLibPromise;
}

// 读 PDF 页数(顺带校验文件是否为有效 PDF)
async function pdfPageCount(file) {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(await file.arrayBuffer());
  return doc.getPageCount();
}

// 把 "1-3,5,8" 解析成页码数组(0 基);留空表示全部
// 容忍中文顿号/全角逗号/全角波浪号,以及 "2 - 4" 这种区间内带空格的写法
function parsePageRange(str, total) {
  let s = String(str || '').trim();
  if (!s) return Array.from({ length: total }, (_, i) => i);
  // 先把区间符两侧的空格收紧,否则 "2 - 4" 会被空格拆成三段
  s = s.replace(/\s*([-~～—])\s*/g, '$1');
  const out = [];
  for (const part of s.split(/[,、,;\s]+/)) {
    if (!part) continue;
    const m = part.match(/^(\d+)[-~～—](\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.push(i - 1);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n >= 1 && n <= total) out.push(n - 1);
    }
  }
  // 去重且保序
  return [...new Set(out)];
}

// ---- 文字转 PNG(中文水印/页码靠它,避免引入几 MB 的中文字体文件)----
// 浏览器自带中文字体,画到 canvas 再贴进 PDF;输出透明背景,可加旋转
const TEXT_SS = 3; // 超采样倍数,保证贴进 PDF 后边缘不糊

function textToPng(text, { fontSize, color, angle = 0, bold = true }) {
  const font = `${bold ? 'bold ' : ''}${fontSize}px "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const tw = Math.max(1, Math.ceil(probe.measureText(text).width));
  const th = Math.ceil(fontSize * 1.35);

  const rad = Math.abs(angle) * Math.PI / 180;
  const pad = Math.ceil(fontSize * 0.35);
  // 旋转后的外接矩形,避免转完被裁掉
  const boxW = Math.ceil(tw * Math.cos(rad) + th * Math.sin(rad)) + pad * 2;
  const boxH = Math.ceil(tw * Math.sin(rad) + th * Math.cos(rad)) + pad * 2;

  const c = document.createElement('canvas');
  c.width = boxW * TEXT_SS;
  c.height = boxH * TEXT_SS;
  const ctx = c.getContext('2d');
  ctx.scale(TEXT_SS, TEXT_SS);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(boxW / 2, boxH / 2);
  ctx.rotate(angle * Math.PI / 180);
  ctx.fillText(text, 0, 0);

  return { dataUrl: c.toDataURL('image/png'), w: boxW, h: boxH };
}

// 把图片素材贴到一页上(位置用九宫格 + 边距,尺寸按页宽比例)
function placeOnPage(page, emb, args) {
  const { pos, widthPct, opacity, margin } = args;
  const pw = page.getWidth(), ph = page.getHeight();
  const w = pw * (widthPct / 100);
  const h = w * (emb.height / emb.width);

  let x, y;
  switch (pos) {
    case 'tl': x = margin;             y = ph - margin - h; break;
    case 'tc': x = (pw - w) / 2;       y = ph - margin - h; break;
    case 'tr': x = pw - margin - w;    y = ph - margin - h; break;
    case 'bl': x = margin;             y = margin;          break;
    case 'bc': x = (pw - w) / 2;       y = margin;          break;
    case 'br': x = pw - margin - w;    y = margin;          break;
    case 'center':
    default:   x = (pw - w) / 2;       y = (ph - h) / 2;    break;
  }
  page.drawImage(emb, { x, y, width: w, height: h, opacity: opacity / 100 });
}

// 平铺:按水印尺寸在整页重复铺满(防截图/防复印效果)
function tileOnPage(page, emb, args) {
  const { widthPct, opacity, angle } = args;
  const pw = page.getWidth(), ph = page.getHeight();
  const w = pw * (widthPct / 100);
  const h = w * (emb.height / emb.width);
  const stepX = w * 1.25, stepY = h * 2.1;
  // 必须让 (cols-1)*stepX + w ≥ pw 才算铺满;漏掉自己那一格会在页边留下无水印的空白
  const cols = Math.max(1, Math.ceil((pw - w) / stepX) + 1);
  const rows = Math.max(1, Math.ceil((ph - h) / stepY) + 1);
  // 让整体居中:算出实际占用尺寸后回退半个格
  const offX = (pw - (cols - 1) * stepX - w) / 2;
  const offY = (ph - (rows - 1) * stepY - h) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      page.drawImage(emb, {
        x: offX + c * stepX,
        y: offY + r * stepY,
        width: w,
        height: h,
        opacity: opacity / 100,
        rotate: (angle || 0) * Math.PI / 180,
      });
    }
  }
}

// 取当前已选 PDF 并打开;失败时提示并返回 null
async function openSourcePdf() {
  const f = state.files[0];
  if (!f) { alert('请先选择一个 PDF 文件'); return null; }
  if (!isPdfFile(f)) { alert('请选择一个 PDF 文件'); return null; }
  const { PDFDocument } = await loadPdfLib();
  try {
    return { doc: await PDFDocument.load(await f.arrayBuffer()), file: f, PDFDocument };
  } catch (e) {
    alert(`无法读取「${f.name}」:文件可能已加密、有密码保护或已损坏`);
    return null;
  }
}

// 把 PDF 字节下载下来
function savePdf(bytes, name) {
  downloadImage(new Blob([bytes], { type: 'application/pdf' }), name);
}

// ============================================================
// 图片处理核心
// ============================================================
const MAX_DIM = 4096;

function loadFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function imageToCanvas(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

// 缩到安全尺寸(超长边 ≤ MAX_DIM),避免移动端内存溢出
function safeCanvas(img) {
  const s = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  return imageToCanvas(img, Math.round(img.naturalWidth * s), Math.round(img.naturalHeight * s));
}

// 输出 mime:保持原格式,无法识别则退回 JPG
function outMime(file) {
  const t = file.type;
  return (t === 'image/png' || t === 'image/jpeg' || t === 'image/webp') ? t : 'image/jpeg';
}

// 免费版质量上限;支持者 100%
function qualityCap() {
  return state.premium ? 1 : 0.8;
}

// 裁剪:rect 为归一化坐标(0~1),基于当前 canvas 尺寸换算
function applyCrop(src, rect) {
  const x = Math.round(rect.nx * src.width);
  const y = Math.round(rect.ny * src.height);
  const w = Math.round(rect.nw * src.width);
  const h = Math.round(rect.nh * src.height);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
  return c;
}

// 旋转 + 翻转
function transformCanvas(src) {
  const w = src.width, h = src.height;
  const swap = state.rotate % 180 !== 0;
  const outW = swap ? h : w;
  const outH = swap ? w : h;
  const c = document.createElement('canvas');
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext('2d');
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(state.rotate * Math.PI / 180);
  if (state.flipH) ctx.scale(-1, 1);
  if (state.flipV) ctx.scale(1, -1);
  ctx.drawImage(src, -w / 2, -h / 2);
  return c;
}

// 显式调整尺寸(等比/非等比)
function applyResize(src) {
  const rw = parseInt(resizeW.value, 10) || 0;
  const rh = parseInt(resizeH.value, 10) || 0;
  if (!rw && !rh) return src;
  const w = src.width, h = src.height;
  let nw = rw || w, nh = rh || h;
  if (resizeLock.checked) {
    const ar = w / h;
    if (rw && !rh) nh = Math.round(rw / ar);
    else if (rh && !rw) nw = Math.round(rh * ar);
    else { nw = rw; nh = Math.round(rw / ar); }
  }
  nw = Math.min(MAX_DIM, Math.max(1, nw));
  nh = Math.min(MAX_DIM, Math.max(1, nh));
  const c = document.createElement('canvas');
  c.width = nw;
  c.height = nh;
  c.getContext('2d').drawImage(src, 0, 0, nw, nh);
  return c;
}

// 画水印(可选,不强制)
function drawWatermark(ctx, w, h, text) {
  if (!text) return;
  const pos = wmPos.value;
  const fontSize = Math.max(14, Math.round(w / 20));
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = 'bottom';
  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  const pad = fontSize * 0.6;

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  let x, y;
  const margin = pad;
  switch (pos) {
    case 'br': x = w - tw - margin; y = h - margin; break;
    case 'bl': x = margin;          y = h - margin; break;
    case 'tr': x = w - tw - margin; y = fontSize + margin; break;
    case 'tl': x = margin;          y = fontSize + margin; break;
    case 'center':
    default:   x = (w - tw) / 2;    y = (h + fontSize) / 2; break;
  }
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

// 调色:拼出 CSS filter 字符串
function buildFilterString() {
  const fl = state.filter;
  const parts = [
    `brightness(${(100 + fl.bright) / 100})`,
    `contrast(${fl.contrast / 100})`,
    `saturate(${fl.saturate / 100})`,
  ];
  if (fl.gray) parts.push('grayscale(1)');
  if (fl.sepia) parts.push('sepia(0.8)');
  if (fl.invert) parts.push('invert(1)');
  return parts.join(' ');
}

function applyFilterCanvas(img) {
  const cv = safeCanvas(img);
  const ctx = cv.getContext('2d');
  const f = buildFilterString();
  if (f) {
    ctx.filter = f;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.filter = 'none';
  }
  return cv;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), mime, quality);
  });
}

// 二分找最接近目标大小的质量(不超 targetBytes、质量越高越好);PNG 无损不支持,调用方自行排除
async function findQualityForTarget(canvas, mime, targetBytes, maxQ) {
  let lo = 0.01, hi = maxQ;
  let best = null;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, mime, mid);
    if (!blob) return null;
    if (blob.size <= targetBytes) { best = blob; lo = mid; }
    else { hi = mid; }
  }
  if (!best) best = await canvasToBlob(canvas, mime, lo);
  return best;
}

// ---- 各工具的单图处理(返回 Blob)----
async function compressOne(file) {
  const img = await loadFile(file);
  const cv = safeCanvas(img);
  const mime = compressFormat.value;
  const kb = parseInt(targetKB.value, 10) || 0;
  let blob;
  if (kb > 0) {
    blob = await findQualityForTarget(cv, mime, kb * 1024, qualityCap());
  } else {
    let q = parseInt(quality.value, 10) / 100;
    if (!state.premium) q = Math.min(q, 0.8);
    blob = await canvasToBlob(cv, mime, q);
  }
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

async function convertOne(file) {
  const img = await loadFile(file);
  const cv = safeCanvas(img);
  const mime = formatSel.value;
  let blob;
  if (mime === 'image/png') {
    blob = await canvasToBlob(cv, mime);
  } else {
    let q = parseInt(convertQuality.value, 10) / 100;
    if (!state.premium) q = Math.min(q, 0.8);
    blob = await canvasToBlob(cv, mime, q);
  }
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

async function watermarkOne(file) {
  const img = await loadFile(file);
  const cv = safeCanvas(img);
  drawWatermark(cv.getContext('2d'), cv.width, cv.height, wmText.value.trim());
  const blob = await canvasToBlob(cv, outMime(file), qualityCap());
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

async function resizeOne(file) {
  const img = await loadFile(file);
  let cv = imageToCanvas(img, img.naturalWidth, img.naturalHeight);
  cv = applyResize(cv);
  const blob = await canvasToBlob(cv, outMime(file), qualityCap());
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

async function rotateOne(file) {
  const img = await loadFile(file);
  let cv = imageToCanvas(img, img.naturalWidth, img.naturalHeight);
  cv = transformCanvas(cv);
  const blob = await canvasToBlob(cv, outMime(file), qualityCap());
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

async function cropOne(file) {
  const img = await loadFile(file);
  let cv = imageToCanvas(img, img.naturalWidth, img.naturalHeight);
  cv = applyCrop(cv, state.crop);
  const blob = await canvasToBlob(cv, outMime(file), qualityCap());
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

async function adjustOne(file) {
  const img = await loadFile(file);
  const cv = applyFilterCanvas(img);
  const blob = await canvasToBlob(cv, outMime(file), qualityCap());
  if (!blob) throw new Error('生成图片失败');
  return blob;
}

// ---- 拼图(支持者)----
function composeCollage(imgs, layout, gap) {
  const n = imgs.length;
  let cols, rows;
  if (layout === 'h') { cols = n; rows = 1; }
  else if (layout === 'v') { cols = 1; rows = n; }
  else if (layout === 'nine') { cols = 3; rows = Math.ceil(n / 3); }
  else { cols = Math.ceil(Math.sqrt(n)); rows = Math.ceil(n / cols); }

  const cell = 600;
  const W = cols * cell + (cols - 1) * gap;
  const H = rows * cell + (rows - 1) * gap;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  imgs.forEach((img, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * (cell + gap), y = row * (cell + gap);
    const s = Math.max(cell / img.naturalWidth, cell / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.drawImage(img, x + (cell - dw) / 2, y + (cell - dh) / 2, dw, dh);
  });
  return cv;
}

async function collageFiles() {
  if (!state.premium) { alert('拼图需要一次处理多张图片。如果图轻松帮到了你,欢迎支持我们解锁'); upgradeModal.hidden = false; return; }
  if (state.files.length < 2) { alert('拼图需要至少 2 张图片'); return; }
  const layout = collageLayout.value;
  const gap = parseInt(collageGap.value, 10) || 0;
  const imgs = [];
  for (const f of state.files) imgs.push(await loadFile(f));
  const cv = composeCollage(imgs, layout, gap);
  const blob = await canvasToBlob(cv, 'image/jpeg', 0.92);
  if (!blob) { alert('拼图失败'); return; }
  renderSingle(blob, '拼图.jpg');
}

// ---- 图片转 PDF ----
function buildPdf(pages) {
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const push = (data) => {
    if (typeof data === 'string') data = enc.encode(data);
    chunks.push(data);
    offset += data.length;
  };
  const offsets = [0];

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])); // 二进制标记行

  // 1: Catalog
  offsets[1] = offset; push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  // 2: Pages
  const kids = pages.map((_, i) => `${5 + i * 3} 0 R`).join(' ');
  offsets[2] = offset; push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((p, i) => {
    const imgN = 3 + i * 3, contentN = 4 + i * 3, pageN = 5 + i * 3;
    // 图片对象
    offsets[imgN] = offset;
    push(`${imgN} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>\nstream\n`);
    push(p.data);
    push('\nendstream\nendobj\n');
    // 内容流
    const content = `q ${p.w} 0 0 ${p.h} 0 0 cm /Im0 Do Q`;
    offsets[contentN] = offset;
    push(`${contentN} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    // 页面对象
    offsets[pageN] = offset;
    push(`${pageN} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im0 ${imgN} 0 R >> >> /Contents ${contentN} 0 R >>\nendobj\n`);
  });

  const total = pages.length * 3 + 3;
  const xrefStart = offset;
  let xref = 'xref\n0 ' + total + '\n';
  xref += '0000000000 65535 f \r\n';
  for (let i = 1; i < total; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \r\n';
  }
  push(xref);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(chunks, { type: 'application/pdf' });
}

async function topdfFiles() {
  if (!state.files.length) { alert('请先选择图片'); return; }
  const pages = [];
  for (const f of state.files) {
    try {
      const img = await loadFile(f);
      const cv = safeCanvas(img);
      const jpeg = await canvasToBlob(cv, 'image/jpeg', 0.92);
      if (!jpeg) continue;
      pages.push({ data: new Uint8Array(await jpeg.arrayBuffer()), w: cv.width, h: cv.height });
    } catch (e) { console.error('转PDF失败:', f.name, e); }
  }
  if (!pages.length) { alert('没有可转换的图片'); return; }
  const pdf = buildPdf(pages);
  downloadImage(pdf, '图轻松_图片转PDF.pdf');
}

// ---- 图片转 Base64 ----
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function tobase64Files() {
  if (!state.files.length) { alert('请先选择图片'); return; }
  const list = [];
  for (const f of state.files) list.push(await fileToDataURL(f));
  b64Text.value = list.join('\n');
  b64Len.textContent = list.reduce((a, s) => a + s.length, 0).toLocaleString() + ' 字符';
  b64Result.hidden = false;
}

// ---- PDF 合并 ----
async function mergePdfs() {
  if (!state.premium) { alert('PDF 合并需要一次处理多个文件。如果图轻松帮到了你,欢迎支持我们解锁'); upgradeModal.hidden = false; return; }
  if (state.files.length < 2) { alert('合并至少需要 2 个 PDF 文件'); return; }

  const btn = document.querySelector('[data-process="pdfmerge"]');
  btn.disabled = true;
  const oldText = btn.textContent;
  try {
    const { PDFDocument } = await loadPdfLib();
    const out = await PDFDocument.create();
    let total = 0;
    for (let i = 0; i < state.files.length; i++) {
      const f = state.files[i];
      btn.textContent = `合并中… (${i + 1}/${state.files.length})`;
      try {
        const src = await PDFDocument.load(await f.arrayBuffer());
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        total += pages.length;
      } catch (e) {
        // 加密或损坏的 PDF:跳过并告知,不静默产出残缺文件
        alert(`跳过「${f.name}」:无法读取(可能已加密或有密码保护)`);
      }
    }
    if (!total) { alert('没有可合并的 PDF 页面'); return; }
    const bytes = await out.save();
    const name = (mergeName.value.trim() || '图轻松_合并') + '.pdf';
    downloadImage(new Blob([bytes], { type: 'application/pdf' }), name);
  } catch (e) {
    alert('合并失败:' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// ---- PDF 拆分 ----
// PDF 各面板的信息刷新统一入口
async function refreshPdfPanels() {
  await refreshSplitInfo();
  await loadPageManager();
}

async function refreshSplitInfo() {
  if (state.view !== 'pdfsplit' && state.view !== 'pdfpagenum') return;
  const f = state.files[0];
  const target = state.view === 'pdfsplit' ? splitInfo : pgnumInfo;
  const idle = state.view === 'pdfsplit'
    ? '选择一个 PDF 后显示页数'
    : '选择一个 PDF 后显示页数';
  if (!f) { target.textContent = idle; return; }
  target.textContent = '正在读取页数…';
  try {
    const n = await pdfPageCount(f);
    // 期间可能已换文件,避免写入过期结果
    if (state.files[0] !== f) return;
    target.textContent = `《${f.name}》共 ${n} 页`;
  } catch (e) {
    if (state.files[0] !== f) return;
    target.textContent = '⚠ 无法读取该 PDF(可能已加密或损坏)';
  }
}

async function splitPdf() {
  if (!state.files.length) { alert('请先选择一个 PDF'); return; }
  const mode = splitMode.value;
  if (mode === 'each' && !state.premium) {
    alert('「每页拆成单独 PDF」会一次输出很多文件。欢迎支持我们解锁');
    upgradeModal.hidden = false;
    return;
  }
  const btn = document.querySelector('[data-process="pdfsplit"]');
  btn.disabled = true;
  const oldText = btn.textContent;
  try {
    const { PDFDocument } = await loadPdfLib();
    const f = state.files[0];
    btn.textContent = '读取中…';
    const src = await PDFDocument.load(await f.arrayBuffer());
    const total = src.getPageCount();
    const base = f.name.replace(/\.pdf$/i, '');

    if (mode === 'extract') {
      const idx = parsePageRange(splitRange.value, total);
      if (!idx.length) { alert(`页码范围无效,该 PDF 共 ${total} 页`); return; }
      btn.textContent = '提取中…';
      const out = await PDFDocument.create();
      (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const label = splitRange.value.trim() ? '提取' : '全页';
      downloadImage(new Blob([bytes], { type: 'application/pdf' }), `${base}_${label}.pdf`);
    } else {
      // 每页一个 PDF,打包成 ZIP
      const entries = [];
      for (let i = 0; i < total; i++) {
        btn.textContent = `拆分中… (${i + 1}/${total})`;
        const out = await PDFDocument.create();
        (await out.copyPages(src, [i])).forEach((p) => out.addPage(p));
        const bytes = await out.save();
        const pad = String(i + 1).padStart(String(total).length, '0');
        entries.push({ name: `${base}_第${pad}页.pdf`, data: new Uint8Array(bytes) });
      }
      btn.textContent = '打包中…';
      downloadImage(buildZip(entries), `${base}_拆分.zip`);
    }
  } catch (e) {
    alert('拆分失败:' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// ---- PDF 水印 ----
async function pdfWatermark() {
  const src = await openSourcePdf();
  if (!src) return;
  const btn = document.querySelector('[data-process="pdfwatermark"]');
  btn.disabled = true;
  const oldText = btn.textContent;
  try {
    const { doc } = src;
    const type = pdfwmType.value;
    const total = doc.getPageCount();
    const idx = parsePageRange(pdfwmPages.value, total);
    if (!idx.length) { alert(`页码范围无效,该 PDF 共 ${total} 页`); return; }

    let emb;
    if (type === 'text') {
      const text = pdfwmText.value.trim();
      if (!text) { alert('请输入水印文字'); return; }
      btn.textContent = '生成水印…';
      const png = textToPng(text, {
        fontSize: parseInt(pdfwmSize.value, 10),
        color: pdfwmColor.value,
        angle: parseInt(pdfwmAngle.value, 10),
      });
      emb = await doc.embedPng(png.dataUrl);
    } else {
      const img = pdfwmImage.files && pdfwmImage.files[0];
      if (!img) { alert('请选择一张水印图片'); return; }
      btn.textContent = '读取图片…';
      emb = await embedAnyImage(doc, img);
      if (!emb) { alert('图片读取失败'); return; }
    }

    const args = {
      widthPct: parseInt(pdfwmScale.value, 10),
      opacity: parseInt(pdfwmOpacity.value, 10),
      angle: parseInt(pdfwmAngle.value, 10),
      margin: Math.round(doc.getPage(idx[0]).getWidth() * 0.04),
      pos: pdfwmLayout.value,
    };

    const pages = doc.getPages();
    const tiled = pdfwmLayout.value === 'tile';
    idx.forEach((i) => {
      if (tiled) tileOnPage(pages[i], emb, args);
      else placeOnPage(pages[i], emb, args);
    });

    btn.textContent = '保存中…';
    const base = src.file.name.replace(/\.pdf$/i, '');
    savePdf(await doc.save(), `${base}_水印.pdf`);
  } catch (e) {
    alert('添加水印失败:' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// 把任意浏览器能解码的图片(含 PNG 透明)嵌进 PDF
async function embedAnyImage(doc, file) {
  const buf = await file.arrayBuffer();
  const isPng = /png$/i.test(file.type) || /\.png$/i.test(file.name);
  if (isPng) return doc.embedPng(buf);
  const isJpg = /jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  if (isJpg) return doc.embedJpg(buf);
  // 其他格式(webp/gif/bmp 等)统一转成 PNG 再嵌入
  const url = URL.createObjectURL(file);
  try {
    const img = await loadFile(file);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return doc.embedPng(c.toDataURL('image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- PDF 页码 ----
async function pdfPageNum() {
  const src = await openSourcePdf();
  if (!src) return;
  const btn = document.querySelector('[data-process="pdfpagenum"]');
  btn.disabled = true;
  const oldText = btn.textContent;
  try {
    const { doc } = src;
    const total = doc.getPageCount();
    const start = Math.max(1, parseInt(pgnumStart.value, 10) || 1);
    const fmt = pgnumFormat.value;
    const fontSizePt = parseInt(pgnumSize.value, 10);
    const color = pgnumColor.value;
    const skipFirst = pgnumSkipFirst.checked;
    const pages = doc.getPages();

    // 缓存相同文字的 PNG,避免每页重复渲染
    const cache = new Map();
    const makePng = (label) => {
      if (!cache.has(label)) cache.set(label, textToPng(label, { fontSize: 40, color, angle: 0, bold: false }));
      return cache.get(label);
    };

    for (let i = 0; i < total; i++) {
      if (skipFirst && i === 0) continue;
      btn.textContent = `加页码… (${i + 1}/${total})`;
      const n = start + (skipFirst ? i - 1 : i);
      const label = fmt
        .replace(/\{n\}/g, String(n))
        .replace(/\{total\}/g, String(total + start - 1));
      const png = makePng(label);
      const emb = await doc.embedPng(png.dataUrl);
      const page = pages[i];
      // 按 PDF 点尺寸换算:让页码高度约为页高的 4%
      const h = page.getHeight() * 0.04;
      const w = h * (png.w / png.h);
      const margin = page.getWidth() * 0.05;
      const pw = page.getWidth(), ph = page.getHeight();
      let x, y;
      const pos = pgnumPos.value;
      const bottom = pos[0] === 'b';
      const right = pos[1] === 'r', center = pos[1] === 'c';
      y = bottom ? margin : ph - margin - h;
      if (right) x = pw - margin - w;
      else if (center) x = (pw - w) / 2;
      else x = margin;
      page.drawImage(emb, { x, y, width: w, height: h });
    }

    btn.textContent = '保存中…';
    const base = src.file.name.replace(/\.pdf$/i, '');
    savePdf(await doc.save(), `${base}_页码.pdf`);
  } catch (e) {
    alert('添加页码失败:' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// ---- PDF 页面管理 ----
// 每项:{ srcIndex, rotate, deleted },srcIndex 指向原文档页;空白页 srcIndex = -1
let pageModel = [];
let pageSrcDoc = null;
let pageSrcFile = null;

async function loadPageManager() {
  if (state.view !== 'pdfpages') return;
  const f = state.files[0];
  if (!f) {
    pageSrcDoc = null; pageModel = []; pageSrcFile = null;
    pagesInfo.textContent = '选择一个 PDF 后显示页面';
    pageGrid.innerHTML = '';
    pagesSummary.textContent = '';
    return;
  }
  // 同一个文件就别重载了,否则来回切工具会把手动排好的页序冲掉
  if (pageSrcFile === f && pageSrcDoc) return;

  const src = await openSourcePdf();
  if (!src) {
    pageSrcDoc = null; pageModel = []; pageSrcFile = null; pageGrid.innerHTML = '';
    pagesInfo.textContent = '无法读取该 PDF';
    return;
  }
  pageSrcDoc = src.doc;
  pageSrcFile = f;
  pageModel = src.doc.getPageIndices().map((i) => ({ srcIndex: i, rotate: 0, deleted: false }));
  pagesInfo.textContent = `《${src.file.name}》共 ${pageModel.length} 页`;
  renderPageGrid();
}

function renderPageGrid() {
  pageGrid.innerHTML = '';
  pageModel.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'page-card' + (p.deleted ? ' del' : '');
    el.innerHTML = `
      <div class="page-card-body">
        <span class="page-card-num">${p.srcIndex < 0 ? '＋' : p.srcIndex + 1}</span>
        <span class="page-card-rot">${p.rotate ? p.rotate + '°' : (p.srcIndex < 0 ? '空白' : '')}</span>
      </div>
      <div class="page-card-mv left">
        <button data-act="up" title="前移" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button data-act="down" title="后移" ${i === pageModel.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <div class="page-card-actions">
        <button data-act="rot" title="顺时针旋转 90°">⟳</button>
        <button data-act="del" title="${p.deleted ? '恢复此页' : '删除此页'}">${p.deleted ? '↺' : '🗑'}</button>
      </div>
    `;
    el.querySelectorAll('button[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'up' && i > 0) { [pageModel[i - 1], pageModel[i]] = [pageModel[i], pageModel[i - 1]]; }
        else if (act === 'down' && i < pageModel.length - 1) { [pageModel[i + 1], pageModel[i]] = [pageModel[i], pageModel[i + 1]]; }
        else if (act === 'rot') { p.rotate = (p.rotate + 90) % 360; }
        else if (act === 'del') { p.deleted = !p.deleted; }
        else return;
        renderPageGrid();
      });
    });
    pageGrid.appendChild(el);
  });
  updatePagesSummary();
}

function updatePagesSummary() {
  const kept = pageModel.filter((p) => !p.deleted);
  const blank = kept.filter((p) => p.srcIndex < 0).length;
  const rot = kept.filter((p) => p.rotate).length;
  const parts = [`保留 ${kept.length} 页`];
  if (rot) parts.push(`${rot} 页旋转`);
  if (blank) parts.push(`${blank} 页空白`);
  const removed = pageModel.length - kept.length;
  if (removed) parts.push(`已删 ${removed} 页`);
  pagesSummary.textContent = parts.join(' · ');
}

async function saveManagedPdf() {
  if (!pageSrcDoc) { alert('请先选择一个 PDF'); return; }
  const kept = pageModel.filter((p) => !p.deleted);
  if (!kept.length) { alert('至少要保留一页'); return; }
  const btn = document.querySelector('[data-process="pdfpages"]');
  btn.disabled = true;
  const oldText = btn.textContent;
  try {
    const { PDFDocument } = await loadPdfLib();
    const out = await PDFDocument.create();
    const realIdx = kept.filter((p) => p.srcIndex >= 0).map((p) => p.srcIndex);
    const copied = realIdx.length ? await out.copyPages(pageSrcDoc, realIdx) : [];
    // copyPages 返回顺序与传入索引一致,按原顺序消费
    let ci = 0;
    for (const p of kept) {
      let page;
      if (p.srcIndex < 0) {
        const ref = pageSrcDoc.getPage(0);
        page = out.addPage([ref.getWidth(), ref.getHeight()]);
      } else {
        page = out.addPage(copied[ci++]);
      }
      if (p.rotate) {
        const cur = page.getRotation().angle || 0;
        page.setRotation({ type: 'degrees', angle: (cur + p.rotate) % 360 });
      }
    }
    btn.textContent = '保存中…';
    const base = (pageSrcDoc && state.files[0] ? state.files[0].name : 'PDF').replace(/\.pdf$/i, '');
    savePdf(await out.save(), `${base}_页面整理.pdf`);
  } catch (e) {
    alert('保存失败:' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// ---- PDF 盖章 / 插入图片 ----
async function pdfStamp() {
  const src = await openSourcePdf();
  if (!src) return;
  const img = stampImageInput.files && stampImageInput.files[0];
  if (!img) { alert('请选择要插入的图片(公章 / 签名 / 二维码)'); return; }
  const btn = document.querySelector('[data-process="pdfstamp"]');
  btn.disabled = true;
  const oldText = btn.textContent;
  try {
    const { doc } = src;
    const total = doc.getPageCount();
    const idx = parsePageRange(stampPages.value, total);
    if (!idx.length) { alert(`页码范围无效,该 PDF 共 ${total} 页`); return; }

    btn.textContent = '读取图片…';
    const emb = await embedAnyImage(doc, img);
    if (!emb) { alert('图片读取失败'); return; }

    const pages = doc.getPages();
    const args = {
      pos: stampPos.value,
      widthPct: parseInt(stampScale.value, 10),
      opacity: parseInt(stampOpacity.value, 10),
      margin: parseInt(stampMargin.value, 10),
    };
    idx.forEach((i) => placeOnPage(pages[i], emb, args));

    btn.textContent = '保存中…';
    const base = src.file.name.replace(/\.pdf$/i, '');
    savePdf(await doc.save(), `${base}_盖章.pdf`);
  } catch (e) {
    alert('插入图片失败:' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// ============================================================
// 结果渲染
// ============================================================
const processedItems = []; // 已处理结果(供打包下载)

function extFromMime(mime) {
  return { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[mime] || 'jpg';
}

function outNameFor(item) {
  const base = item.file.name.replace(/\.[^.]+$/, '');
  return base + '_处理.' + extFromMime(item.mime);
}

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function renderResult(item) {
  const div = document.createElement('div');
  div.className = 'result-item';
  const outName = outNameFor(item);
  div.innerHTML = `
    <img src="${item.url}" alt="" />
    <div class="result-info">
      <div class="result-name">${esc(outName)}</div>
      <div class="result-size">
        ${fmtSize(item.origSize)} → ${fmtSize(item.outSize)}
        ${item.savedPct >= 0
          ? `<span class="saved">(省 ${item.savedPct}%)</span>`
          : `<span style="color:var(--danger)">(+${-item.savedPct}%)</span>`}
      </div>
    </div>
    <button class="btn-download">下载</button>
  `;
  div.querySelector('.btn-download').addEventListener('click', () => {
    downloadImage(item.blob, outName);
  });
  resultList.appendChild(div);
}

function clearResults() {
  resultList.querySelectorAll('img').forEach((img) => {
    if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  });
  resultList.innerHTML = '';
  processedItems.length = 0;
  zipBtn.hidden = true;
}

function updateZipBtn() {
  zipBtn.hidden = processedItems.length < 2;
}

async function makeResult(file, mime, blob) {
  const url = URL.createObjectURL(blob);
  const origSize = file.size;
  const outSize = blob.size;
  const savedBytes = origSize - outSize;
  const savedPct = Math.round((savedBytes / origSize) * 100);
  return { blob, url, mime, file, origSize, outSize, savedBytes, savedPct };
}

// 批量处理图片工具(压缩/转格式/水印/缩放/旋转/裁剪/调色)
async function processFiles(fn) {
  if (!state.files.length) { alert('请先选择图片'); return; }
  clearResults();
  results.hidden = false;
  countEl.textContent = `共 ${state.files.length} 张`;
  for (let i = 0; i < state.files.length; i++) {
    try {
      const blob = await fn(state.files[i], i);
      const item = await makeResult(state.files[i], blob.type || 'image/jpeg', blob);
      renderResult(item);
      processedItems.push({ name: outNameFor(item), blob });
    } catch (err) {
      console.error('处理失败:', state.files[i].name, err);
    }
  }
  updateZipBtn();
}

// 单结果(拼图等):渲染一个结果项
function renderSingle(blob, name) {
  clearResults();
  results.hidden = false;
  countEl.textContent = '已完成';
  const item = {
    blob, url: URL.createObjectURL(blob), mime: blob.type || 'image/jpeg',
    file: { name }, origSize: blob.size, outSize: blob.size, savedBytes: 0, savedPct: 0,
  };
  renderResult(item);
  processedItems.push({ name: outNameFor(item), blob });
  updateZipBtn();
}

// ============================================================
// 下载 / ZIP
// ============================================================
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

async function downloadImage(blob, filename) {
  if (isIOS) {
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    alert('请长按上方的图片,选择「存储图像」即可保存到相册');
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ---- ZIP 打包下载(纯 JS store 模式)----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(entries) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const parts = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const data = e.data;
    const crc = crc32(data);

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true);
    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);
    parts.push(lh.buffer, nameBytes, data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint16(30, 0, true);
    cd.setUint16(32, 0, true);
    cd.setUint16(34, 0, true);
    cd.setUint16(36, 0, true);
    cd.setUint32(38, 0, true);
    cd.setUint32(42, offset, true);
    central.push(cd.buffer, nameBytes);

    offset += 30 + nameBytes.length + data.length;
  }

  let centralSize = 0;
  for (const c of central) centralSize += c.byteLength;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, offset, true);
  eocd.setUint16(20, 0, true);

  return new Blob([...parts, ...central, eocd.buffer], { type: 'application/zip' });
}

async function downloadAllZip() {
  const entries = [];
  for (const it of processedItems) {
    entries.push({ name: it.name, data: new Uint8Array(await it.blob.arrayBuffer()) });
  }
  const zip = buildZip(entries);
  const fname = '图轻松_批量处理.zip';
  if (isIOS && navigator.canShare && navigator.canShare({ files: [new File([zip], fname, { type: 'application/zip' })] })) {
    try {
      await navigator.share({ files: [new File([zip], fname, { type: 'application/zip' })], title: fname });
      return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(zip);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ============================================================
// 裁剪交互
// ============================================================
let cropImg = null;
let cropScale = 1;
let cropDrag = null;
let cropRectDisp = null;

function getCanvasPos(clientX, clientY) {
  const rect = cropCanvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (cropCanvas.width / rect.width);
  const y = (clientY - rect.top) * (cropCanvas.height / rect.height);
  return {
    x: Math.min(Math.max(x, 0), cropCanvas.width),
    y: Math.min(Math.max(y, 0), cropCanvas.height),
  };
}

function normRect(x1, y1, x2, y2) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

function drawCrop() {
  const ctx = cropCanvas.getContext('2d');
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(cropImg, 0, 0, cropCanvas.width, cropCanvas.height);
  if (cropRectDisp && cropRectDisp.w > 1 && cropRectDisp.h > 1) {
    const r = cropRectDisp;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, cropCanvas.width, r.y);
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, cropCanvas.width - r.x - r.w, r.h);
    ctx.fillRect(0, r.y + r.h, cropCanvas.width, cropCanvas.height - r.y - r.h);
    ctx.strokeStyle = '#4f7cff';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  }
}

function openCrop() {
  if (!state.files.length) { alert('请先选择图片'); return; }
  loadFile(state.files[0]).then((img) => {
    cropImg = img;
    const maxW = Math.min(window.innerWidth * 0.92, 720);
    const maxH = Math.min(window.innerHeight * 0.5, 480);
    cropScale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    cropCanvas.width = Math.max(1, Math.round(img.naturalWidth * cropScale));
    cropCanvas.height = Math.max(1, Math.round(img.naturalHeight * cropScale));
    cropRectDisp = null;
    cropDrag = null;
    drawCrop();
    cropModal.hidden = false;
  });
}

function updateCropStatus() {
  cropStatus.textContent = state.crop ? '✓ 已选裁剪区域' : '未选择';
}

cropBtn.addEventListener('click', openCrop);
cropClear.addEventListener('click', () => { state.crop = null; updateCropStatus(); });
cropCancel.addEventListener('click', () => { cropModal.hidden = true; });
closeCrop.addEventListener('click', () => { cropModal.hidden = true; });
cropModal.addEventListener('click', (e) => { if (e.target === cropModal) cropModal.hidden = true; });
cropApply.addEventListener('click', () => {
  if (!cropRectDisp || cropRectDisp.w < 6 || cropRectDisp.h < 6) {
    alert('请先拖拽框选要保留的区域');
    return;
  }
  state.crop = {
    nx: cropRectDisp.x / cropCanvas.width,
    ny: cropRectDisp.y / cropCanvas.height,
    nw: cropRectDisp.w / cropCanvas.width,
    nh: cropRectDisp.h / cropCanvas.height,
  };
  cropModal.hidden = true;
  updateCropStatus();
});

cropCanvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const p = getCanvasPos(e.clientX, e.clientY);
  cropDrag = { x: p.x, y: p.y };
});
window.addEventListener('mousemove', (e) => {
  if (!cropDrag) return;
  const p = getCanvasPos(e.clientX, e.clientY);
  cropRectDisp = normRect(cropDrag.x, cropDrag.y, p.x, p.y);
  drawCrop();
});
window.addEventListener('mouseup', () => { cropDrag = null; });

cropCanvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  if (!t) return;
  const p = getCanvasPos(t.clientX, t.clientY);
  cropDrag = { x: p.x, y: p.y };
}, { passive: false });
window.addEventListener('touchmove', (e) => {
  if (!cropDrag) return;
  e.preventDefault();
  const t = e.touches[0];
  if (!t) return;
  const p = getCanvasPos(t.clientX, t.clientY);
  cropRectDisp = normRect(cropDrag.x, cropDrag.y, p.x, p.y);
  drawCrop();
}, { passive: false });
window.addEventListener('touchend', () => { cropDrag = null; });

// ============================================================
// 旋转 / 调色 状态反馈
// ============================================================
function updateRotateStatus() {
  const parts = [];
  if (state.rotate) parts.push(state.rotate + '°');
  if (state.flipH) parts.push('水平翻转');
  if (state.flipV) parts.push('垂直翻转');
  rotateStatus.textContent = parts.length ? parts.join(' · ') : '未旋转';
  document.querySelectorAll('[data-flip="h"]').forEach((b) => b.classList.toggle('on', state.flipH));
  document.querySelectorAll('[data-flip="v"]').forEach((b) => b.classList.toggle('on', state.flipV));
}

document.querySelectorAll('[data-rotate], [data-flip]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.rotate !== undefined) {
      state.rotate = (state.rotate + parseInt(btn.dataset.rotate, 10) + 360) % 360;
    } else if (btn.dataset.flip === 'h') {
      state.flipH = !state.flipH;
    } else if (btn.dataset.flip === 'v') {
      state.flipV = !state.flipV;
    }
    updateRotateStatus();
  });
});
rotateReset.addEventListener('click', () => {
  state.rotate = 0;
  state.flipH = false;
  state.flipV = false;
  updateRotateStatus();
});

// 调色滑块
bright.addEventListener('input', () => { state.filter.bright = parseInt(bright.value, 10); brightVal.textContent = bright.value; });
contrast.addEventListener('input', () => { state.filter.contrast = parseInt(contrast.value, 10); contrastVal.textContent = contrast.value; });
saturate.addEventListener('input', () => { state.filter.saturate = parseInt(saturate.value, 10); satVal.textContent = saturate.value; });
document.querySelectorAll('[data-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.filter;
    state.filter[k] = !state.filter[k];
    btn.classList.toggle('on', state.filter[k]);
  });
});
filterReset.addEventListener('click', () => {
  state.filter = { bright: 0, contrast: 100, saturate: 100, gray: false, sepia: false, invert: false };
  bright.value = 0; contrast.value = 100; saturate.value = 100;
  brightVal.textContent = '0'; contrastVal.textContent = '100'; satVal.textContent = '100';
  document.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('on'));
});

// ============================================================
// 工具切换(每个工具独立界面)
// ============================================================
function switchTool(view) {
  const wasPdf = isPdfTool(state.view);
  const nowPdf = isPdfTool(view);

  // 图片工具与 PDF 工具的文件类型不通用,切换时清掉已选文件,避免误处理
  if (wasPdf !== nowPdf && state.files.length) {
    state.files = [];
    results.hidden = true;
    clearResults();
  }

  state.view = view;
  document.querySelectorAll('.tool-tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.tool-panel').forEach((p) => {
    p.hidden = p.dataset.panel !== view;
  });

  // 上传区随工具切换接受类型与文案
  if (nowPdf) {
    fileInput.accept = '.pdf,application/pdf';
    dropIcon.textContent = '📄';
    dropText.innerHTML = '拖拽 PDF 到这里,或 <span class="link">点击选择</span>';
    dropHint.textContent = view === 'pdfmerge' ? '可多选,按选择顺序合并(需支持)' : '支持单个 PDF 文件';
  } else {
    fileInput.accept = 'image/*';
    dropIcon.textContent = '📁';
    dropText.innerHTML = '拖拽图片到这里,或 <span class="link">点击选择</span>';
    dropHint.textContent = '支持 JPG / PNG / WebP,可多选';
  }

  renderFileBar();
  refreshPdfPanels();
}

document.querySelectorAll('.tool-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTool(tab.dataset.view));
});

function updateCollageLock() {
  collageLock.hidden = state.premium;
}
collageUpgrade.addEventListener('click', () => { upgradeModal.hidden = false; });

// PDF 工具的门控提示
function updateProcessLocks() {
  if (!pdfmergeLock) return;
  pdfmergeLock.hidden = state.premium;
  pdfsplitLock.hidden = state.premium;
}
pdfmergeUpgrade.addEventListener('click', () => { upgradeModal.hidden = false; });
pdfsplitUpgrade.addEventListener('click', () => { upgradeModal.hidden = false; });

// 拆分方式切换:只有「提取指定页」需要填页码范围
function updateSplitRangeField() {
  splitRangeField.hidden = splitMode.value !== 'extract';
}
splitMode.addEventListener('change', updateSplitRangeField);

// ---- PDF 水印:文字/图片切换只显示相关选项 ----
function updatePdfwmFields() {
  const isText = pdfwmType.value === 'text';
  pdfwmTextField.hidden = !isText;
  pdfwmImageField.hidden = isText;
  pdfwmSizeField.hidden = !isText;
  pdfwmAngleField.hidden = !isText;
  pdfwmColorField.hidden = !isText;
}
pdfwmType.addEventListener('change', updatePdfwmFields);

// ---- 滑块数值实时显示 ----
const sliderBindings = [
  [pdfwmSize, pdfwmSizeVal, (v) => v],
  [pdfwmOpacity, pdfwmOpacityVal, (v) => v + '%'],
  [pdfwmAngle, pdfwmAngleVal, (v) => v],
  [pdfwmScale, pdfwmScaleVal, (v) => v + '%'],
  [pgnumSize, pgnumSizeVal, (v) => v],
  [stampScale, stampScaleVal, (v) => v + '%'],
  [stampOpacity, stampOpacityVal, (v) => v + '%'],
  [stampMargin, stampMarginVal, (v) => v],
];
sliderBindings.forEach(([input, label, fmt]) => {
  const sync = () => { label.textContent = fmt(input.value); };
  input.addEventListener('input', sync);
  sync();
});

// ---- PDF 页面管理按钮 ----
pagesReset.addEventListener('click', () => {
  if (!pageSrcDoc) { alert('请先选择一个 PDF'); return; }
  pageModel = pageSrcDoc.getPageIndices().map((i) => ({ srcIndex: i, rotate: 0, deleted: false }));
  renderPageGrid();
});
pagesInsert.addEventListener('click', () => {
  if (!pageSrcDoc) { alert('请先选择一个 PDF'); return; }
  pageModel.push({ srcIndex: -1, rotate: 0, deleted: false });
  renderPageGrid();
});

// ============================================================
// 事件绑定
// ============================================================
function handleFiles(fileList) {
  const wantPdf = isPdfTool(state.view);
  const incoming = Array.from(fileList);
  const files = incoming.filter((f) => (wantPdf ? isPdfFile(f) : f.type.startsWith('image/')));

  if (!files.length) {
    alert(wantPdf ? '请选择 PDF 文件' : '请选择图片文件');
    return;
  }
  if (files.length < incoming.length) {
    alert(wantPdf
      ? '已忽略非 PDF 文件,本工具只处理 PDF'
      : '已忽略非图片文件,本工具只处理图片');
  }

  if (!state.premium && (files.length > 1 || state.files.length + files.length > 1)) {
    alert('免费版一次处理 1 个文件。批量处理是我们对支持者的一点谢意,欢迎支持我们');
    files.length = 1;
    if (state.files.length >= 1) files.length = 0;
  }
  if (!files.length) return;

  state.files = state.files.concat(files);
  renderFileBar();
  refreshPdfPanels();
  results.hidden = true;
  clearResults();
}

// ---- 已选文件预览 ----
let thumbUrls = []; // 已生成的缩略图 objectURL,换批时统一回收

function revokeThumbs() {
  thumbUrls.forEach((u) => URL.revokeObjectURL(u));
  thumbUrls = [];
}

function renderFileBar() {
  const n = state.files.length;
  const pdfMode = isPdfTool(state.view);
  const canReorder = state.view === 'pdfmerge' && n > 1;
  fileBar.hidden = n === 0;
  revokeThumbs();
  thumbList.innerHTML = '';
  updateProcessLocks();
  if (!n) {
    fileCount.textContent = '';
    return;
  }
  fileCount.innerHTML = `已选 <b>${n}</b> 个${pdfMode ? ' PDF' : '图片'}`;

  state.files.forEach((file, i) => {
    const el = document.createElement('div');
    el.className = 'thumb';
    const pdf = isPdfFile(file);
    let body;
    if (pdf) {
      body = '<div class="thumb-img thumb-doc">📄<span>PDF</span></div>';
    } else {
      const url = URL.createObjectURL(file);
      thumbUrls.push(url);
      body = `<img class="thumb-img" src="${url}" alt="" />`;
    }
    el.innerHTML = `
      ${body}
      ${n > 1 ? `<span class="thumb-badge">${i + 1}</span>` : ''}
      ${canReorder ? `
        <div class="thumb-order">
          <button class="thumb-mv" data-mv="up" title="上移" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="thumb-mv" data-mv="down" title="下移" ${i === n - 1 ? 'disabled' : ''}>▼</button>
        </div>` : ''}
      <button class="thumb-del" title="移除" aria-label="移除">×</button>
      <div class="thumb-meta">
        <div class="thumb-name">${esc(file.name)}</div>
        <div class="thumb-size">${fmtSize(file.size)}</div>
      </div>
    `;
    if (!pdf) {
      el.title = '点击查看大图';
      el.addEventListener('click', () => openPreview(i));
    }
    el.querySelector('.thumb-del').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(i);
    });
    if (canReorder) {
      el.querySelectorAll('.thumb-mv').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveFile(i, btn.dataset.mv === 'up' ? -1 : 1);
        });
      });
    }
    thumbList.appendChild(el);
  });
}

function removeFile(index) {
  state.files.splice(index, 1);
  renderFileBar();
  refreshPdfPanels();
  results.hidden = true;
  clearResults();
}

// 调整顺序(合并 PDF 用)
function moveFile(index, delta) {
  const j = index + delta;
  if (j < 0 || j >= state.files.length) return;
  const [f] = state.files.splice(index, 1);
  state.files.splice(j, 0, f);
  renderFileBar();
}

let previewUrl = ''; // 当前预览的 objectURL,关闭弹窗时回收

function openPreview(index) {
  const file = state.files[index];
  if (!file) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImg.src = previewUrl;
  previewName.textContent = file.name;
  previewMeta.textContent = `文件大小 ${fmtSize(file.size)}`;
  previewModal.hidden = false;
  // 读真实像素尺寸补充说明(与预览共用同一个 URL,等读到后再回收)
  const probe = new Image();
  probe.onload = () => {
    previewMeta.textContent = `${probe.naturalWidth} × ${probe.naturalHeight} 像素 · 文件大小 ${fmtSize(file.size)}`;
  };
  probe.src = previewUrl;
}

function closePreviewModal() {
  previewModal.hidden = true;
  previewImg.removeAttribute('src'); // 释放解码资源
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});
['dragover', 'dragenter'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); })
);
dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

quality.addEventListener('input', () => { qualityVal.textContent = quality.value + '%'; });
convertQuality.addEventListener('input', () => { convertQualityVal.textContent = convertQuality.value + '%'; });

clearBtn.addEventListener('click', () => {
  state.files = [];
  renderFileBar();
  results.hidden = true;
  clearResults();
});
zipBtn.addEventListener('click', downloadAllZip);

// 图片预览弹窗
closePreview.addEventListener('click', closePreviewModal);
previewClose.addEventListener('click', closePreviewModal);
previewModal.addEventListener('click', (e) => { if (e.target === previewModal) closePreviewModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !previewModal.hidden) closePreviewModal();
});

// 各工具「开始」按钮
async function onProcess(process) {
  // 只在真的点了处理按钮时记一次「工具使用」,比记录页面停留在哪个标签有意义
  track('use', process);
  if (!state.files.length) { alert('请先选择图片'); return; }
  switch (process) {
    case 'compress': await processFiles(compressOne); break;
    case 'convert': await processFiles(convertOne); break;
    case 'watermark':
      if (!wmText.value.trim()) { alert('请先输入要添加的水印文字'); return; }
      await processFiles(watermarkOne); break;
    case 'resize':
      if (!resizeW.value && !resizeH.value) { alert('请输入目标宽度或高度'); return; }
      await processFiles(resizeOne); break;
    case 'rotate': await processFiles(rotateOne); break;
    case 'crop':
      if (!state.crop) { alert('请先选择裁剪区域'); return; }
      await processFiles(cropOne); break;
    case 'adjust': await processFiles(adjustOne); break;
    case 'collage': await collageFiles(); break;
    case 'topdf': await topdfFiles(); break;
    case 'tobase64': await tobase64Files(); break;
    case 'pdfmerge': await mergePdfs(); break;
    case 'pdfsplit': await splitPdf(); break;
    case 'pdfwatermark': await pdfWatermark(); break;
    case 'pdfpagenum': await pdfPageNum(); break;
    case 'pdfpages': await saveManagedPdf(); break;
    case 'pdfstamp': await pdfStamp(); break;
  }
}
document.querySelectorAll('[data-process]').forEach((btn) => {
  btn.addEventListener('click', () => onProcess(btn.dataset.process));
});

// 支持我们 弹窗
upgradeBtn.addEventListener('click', () => { upgradeModal.hidden = false; });
closeModal.addEventListener('click', () => { upgradeModal.hidden = true; });
upgradeModal.addEventListener('click', (e) => {
  if (e.target === upgradeModal) upgradeModal.hidden = true;
});
activateBtn.addEventListener('click', activateCode);
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') activateCode(); });

// 账号弹窗
accountBtn.addEventListener('click', () => {
  if (state.user) {
    if (confirm('已登录 ' + state.user.username + ',退出登录?')) logout();
  } else {
    setAuthMode('login');
    loginModal.hidden = false;
  }
});
closeLogin.addEventListener('click', () => { loginModal.hidden = true; });
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) loginModal.hidden = true;
});
tabLogin.addEventListener('click', () => setAuthMode('login'));
tabRegister.addEventListener('click', () => setAuthMode('register'));
authSubmit.addEventListener('click', authSubmitHandler);
authPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') authSubmitHandler(); });

// Base64 复制/下载
b64Copy.addEventListener('click', () => {
  navigator.clipboard.writeText(b64Text.value).then(() => {
    b64Copy.textContent = '已复制';
    setTimeout(() => { b64Copy.textContent = '复制'; }, 1200);
  });
});
b64Download.addEventListener('click', () => {
  const blob = new Blob([b64Text.value], { type: 'text/plain;charset=utf-8' });
  downloadImage(blob, '图轻松_Base64.txt');
});

// 后台弹窗(仅管理员)
function switchAdminTab(which) {
  const isStats = which === 'stats';
  document.getElementById('tabGen').classList.toggle('active', !isStats);
  document.getElementById('tabStats').classList.toggle('active', isStats);
  document.getElementById('paneGen').hidden = isStats;
  document.getElementById('paneStats').hidden = !isStats;
  if (isStats) loadStats();
}
document.getElementById('tabGen').addEventListener('click', () => switchAdminTab('gen'));
document.getElementById('tabStats').addEventListener('click', () => switchAdminTab('stats'));

adminBtn.addEventListener('click', () => {
  adminModal.hidden = false;
  switchAdminTab('gen');
  loadCodes();
});
closeAdmin.addEventListener('click', () => { adminModal.hidden = true; });
adminModal.addEventListener('click', (e) => { if (e.target === adminModal) adminModal.hidden = true; });
genBtn.addEventListener('click', generateCodes);

// ============================================================
// 在线支付(虎皮椒):点支持档位 → 创建订单 → 跳转扫码 → 回调自动解锁
// 支付未配置(XH_APPID/XH_SECRET 为空)时,退回展示微信收款码(手动发码)
// ============================================================
function showQr(plan) {
  const amounts = { month: '¥9.9 月度', quarter: '¥16.6 季度', halfyear: '¥24.4 半年', year: '¥36.6 年度' };
  const amount = amounts[plan] || '¥9.9 月度';
  const qrAmount = document.getElementById('qrAmount');
  const sec = document.getElementById('payQrSection');
  if (qrAmount) qrAmount.textContent = amount;
  if (sec) sec.hidden = false;
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

let pollTimer = null;
function pollOrder(tradeOrderId) {
  clearInterval(pollTimer);
  let tries = 0;
  pollTimer = setInterval(async () => {
    tries++;
    if (tries > 60) { clearInterval(pollTimer); return; }
    try {
      const res = await fetch('/api/pay/status?trade_order_id=' + encodeURIComponent(tradeOrderId), {
        headers: { Authorization: 'Bearer ' + state.token },
      });
      const data = await res.json();
      if (data.ok && data.status === 'paid') {
        clearInterval(pollTimer);
        try {
          const me = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + state.token } });
          const meData = await me.json();
          if (meData.ok) state.user = meData.user;
          else state.user = { ...state.user, premium: true };
        } catch (e) {
          state.user = { ...state.user, premium: true };
        }
        refreshAuthUI();
        showMsg('✅ 支付成功,感谢你的支持!', true);
      }
    } catch (e) {}
  }, 2000);
}

async function startPayment(plan) {
  if (!state.user) {
    showMsg('请先登录账号再购买', false);
    setAuthMode('login');
    loginModal.hidden = false;
    return;
  }
  if (state.user.premium && !state.user.premiumUntil) {
    showMsg('你已经是我们的长期支持者了,无需再次支持', true);
    return;
  }
  showMsg('正在创建订单…', true);
  try {
    const res = await fetch('/api/pay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.ok && data.url) {
      window.open(data.url, '_blank');
      showMsg('已打开支付页,支持完成后会自动解锁(此页别关)…', true);
      pollOrder(data.tradeOrderId);
    } else {
      showMsg('');
      showQr(plan);
    }
  } catch (e) {
    showMsg('');
    showQr(plan);
  }
}

document.querySelectorAll('.btn-plan').forEach((btn) => {
  btn.addEventListener('click', () => startPayment(btn.dataset.plan));
});

// ============================================================
// 初始化
// ============================================================
async function initAuth() {
  if (state.token) {
    try {
      const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + state.token } });
      const data = await res.json();
      if (data.ok) state.user = data.user;
      else { state.token = ''; localStorage.removeItem(TOKEN_KEY); }
    } catch (e) {
      // 网络异常先不清 token,避免误登出
    }
  }
  refreshAuthUI();
}

initAuth();
switchTool('compress');
updateRotateStatus();
updateCropStatus();
updateSplitRangeField();
updatePdfwmFields();
track('pv'); // 记一次页面浏览(含来源,用于判断哪个渠道有效)
