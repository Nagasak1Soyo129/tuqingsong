// ============================================================
// 图轻松 —— 图片工具箱:压缩 / 转格式 / 加水印 / 裁剪 / 调整尺寸 / 旋转
// 纯前端处理,图片不出浏览器,无服务器成本
// 变现:免费版 = 单张 + 强制水印 + 质量上限 80%
//       会员  = 批量 + 去水印 + 高清(质量 100%)
// 会员绑定账号(注册/登录),激活码激活后跨设备生效
// ============================================================

const state = {
  files: [],                                                   // 原始 File 列表
  token: localStorage.getItem('tqs_token') || '',              // 登录 token
  user: null,                                                  // { username, premium, admin }
  premium: false,
  rotate: 0,                                                   // 0/90/180/270
  flipH: false,
  flipV: false,
  crop: null,                                                  // { nx, ny, nw, nh } 归一化(0~1)
};

// ---- DOM 引用 ----
const $ = (sel) => document.querySelector(sel);
const dropZone = $('#dropZone');
const fileInput = $('#fileInput');
const controls = $('#controls');
const results = $('#results');
const resultList = $('#resultList');
const countEl = $('#count');

const qualityInput = $('#quality');
const qualityVal = $('#qualityVal');
const formatSel = $('#format');
const wmTextInput = $('#wmText');
const wmPosSel = $('#wmPos');
const processBtn = $('#processBtn');
const clearBtn = $('#clearBtn');

const resizeWInput = $('#resizeW');
const resizeHInput = $('#resizeH');
const resizeLock = $('#resizeLock');
const rotateStatus = $('#rotateStatus');
const cropStatus = $('#cropStatus');
const cropBtn = $('#cropBtn');
const cropClear = $('#cropClear');

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
const authPass = $('#authPass');
const authSubmit = $('#authSubmit');
const authMsgEl = $('#authMsg');

const cropModal = $('#cropModal');
const closeCrop = $('#closeCrop');
const cropCanvas = $('#cropCanvas');
const cropApply = $('#cropApply');
const cropCancel = $('#cropCancel');

// ============================================================
// 账号系统(注册/登录,后端校验,会员状态存服务器)
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
    else if (u.premium) accountBtn.textContent = `👤 ${u.username} · 会员`;
    else accountBtn.textContent = `👤 ${u.username}`;
    upgradeBtn.textContent = u.premium ? '👑 已开通会员' : '⭐ 升级会员';
    upgradeBtn.style.background = u.premium ? 'linear-gradient(135deg, var(--ok), #2bb673)' : '';
  } else {
    accountBtn.textContent = '登录';
    upgradeBtn.textContent = '⭐ 升级会员';
    upgradeBtn.style.background = '';
  }
}

function setAuthMode(mode) {
  authMode = mode;
  loginTitle.textContent = mode === 'login' ? '登录' : '注册';
  authSubmit.textContent = mode === 'login' ? '登录' : '注册';
  tabLogin.classList.toggle('active', mode === 'login');
  tabRegister.classList.toggle('active', mode === 'register');
  authMsg('');
}
function authMsg(text, ok) {
  authMsgEl.textContent = text || '';
  authMsgEl.className = 'activate-msg' + (text ? (ok ? ' ok' : ' err') : '');
}

async function authSubmitHandler() {
  const username = authUser.value.trim();
  const password = authPass.value;
  if (!username) { authMsg('请输入用户名', false); return; }
  if (password.length < 6) { authMsg('密码至少 6 位', false); return; }
  authSubmit.disabled = true;
  try {
    const res = await fetch('/api/' + (authMode === 'login' ? 'login' : 'register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.ok) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      authMsg(authMode === 'login' ? '✅ 登录成功' : '✅ 注册成功', true);
      refreshAuthUI();
      setTimeout(() => { loginModal.hidden = true; authPass.value = ''; authMsg(''); }, 600);
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

// 激活码:需登录,激活后写入账号(会员跨设备)
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
      showMsg(data.admin ? '👑 主控激活成功(管理员模式)' : '✅ 激活成功,会员已生效!', true);
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
  const rw = parseInt(resizeWInput.value, 10) || 0;
  const rh = parseInt(resizeHInput.value, 10) || 0;
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

// 画水印
function drawWatermark(ctx, w, h, text) {
  if (!text) return;

  const pos = wmPosSel.value;
  const fontSize = Math.max(14, Math.round(w / 20));
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = 'bottom';
  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  const pad = fontSize * 0.6;

  // 半透明白色文字 + 阴影,保证深色/浅色图都可见
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
  ctx.shadowBlur = 0; // 重置,避免影响后续
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), mime, quality);
  });
}

async function processOne(file, index) {
  const img = await loadFile(file);

  const origSize = file.size;
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // 会员可输出 100% 质量,免费限 80%
  let quality = parseInt(qualityInput.value, 10) / 100;
  if (!state.premium) quality = Math.min(quality, 0.8);

  // 水印:免费版强制加水印(留空则用站名);会员可留空去除
  let wmText = wmTextInput.value.trim();
  if (!state.premium && !wmText) wmText = '图轻松';

  // 1) 先缩到安全尺寸(超长边 ≤ MAX_DIM),避免移动端内存溢出
  const s = Math.min(1, MAX_DIM / Math.max(origW, origH));
  let cv = imageToCanvas(img, Math.round(origW * s), Math.round(origH * s));

  // 2) 裁剪 → 3) 旋转/翻转 → 4) 显式调整尺寸 → 5) 水印 → 6) 编码
  if (state.crop) cv = applyCrop(cv, state.crop);
  if (state.rotate || state.flipH || state.flipV) cv = transformCanvas(cv);
  cv = applyResize(cv);

  drawWatermark(cv.getContext('2d'), cv.width, cv.height, wmText);

  const mime = formatSel.value;
  const blob = await canvasToBlob(cv, mime, quality);
  if (!blob) throw new Error('生成图片失败,可能图片过大');
  const url = URL.createObjectURL(blob);
  const outSize = blob.size;

  const savedBytes = origSize - outSize;
  const savedPct = Math.round((savedBytes / origSize) * 100);

  return { blob, url, outSize, file, origSize, savedBytes, savedPct, mime };
}

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function extFromMime(mime) {
  return { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[mime] || 'jpg';
}

// 移动端下载:iOS 用系统分享(可「存储图像」),安卓/桌面直接下载
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

async function downloadImage(blob, filename) {
  if (isIOS) {
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // 用户取消分享,不算错误
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

// ============================================================
// 裁剪交互
// ============================================================
let cropImg = null;       // 正在裁剪的图片
let cropScale = 1;        // 原图像素 -> 画布显示 的比例(仅用于展示)
let cropDrag = null;      // 拖拽起点 {x,y}(画布坐标)
let cropRectDisp = null;  // 当前框选(画布坐标){x,y,w,h}

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
    // 选区外压暗
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, cropCanvas.width, r.y);
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, cropCanvas.width - r.x - r.w, r.h);
    ctx.fillRect(0, r.y + r.h, cropCanvas.width, cropCanvas.height - r.y - r.h);
    // 选区边框
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
  cropStatus.textContent = state.crop ? '✓ 已选裁剪区域' : '';
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

// 鼠标拖拽
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

// 触摸拖拽(手机)
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
// 旋转/翻转
// ============================================================
function updateRotateStatus() {
  const parts = [];
  if (state.rotate) parts.push(state.rotate + '°');
  if (state.flipH) parts.push('水平翻转');
  if (state.flipV) parts.push('垂直翻转');
  rotateStatus.textContent = parts.length ? parts.join(' · ') : '';
}
document.querySelectorAll('.btn-rotate').forEach((btn) => {
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
document.getElementById('rotateReset').addEventListener('click', () => {
  state.rotate = 0;
  state.flipH = false;
  state.flipV = false;
  updateRotateStatus();
});

// ============================================================
// 渲染结果
// ============================================================
function renderResult(item, index) {
  const div = document.createElement('div');
  div.className = 'result-item';

  const base = item.file.name.replace(/\.[^.]+$/, '');
  const outName = base + '_处理.' + extFromMime(item.mime);

  div.innerHTML = `
    <img src="${item.url}" alt="" />
    <div class="result-info">
      <div class="result-name">${outName}</div>
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
}

async function processAll() {
  clearResults();
  results.hidden = false;
  countEl.textContent = `共 ${state.files.length} 张`;

  for (let i = 0; i < state.files.length; i++) {
    try {
      const item = await processOne(state.files[i], i);
      renderResult(item, i);
    } catch (err) {
      console.error('处理失败:', state.files[i].name, err);
    }
  }
}

// ============================================================
// 事件绑定
// ============================================================
function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;

  // 免费版限单张
  if (!state.premium && (files.length > 1 || state.files.length + files.length > 1)) {
    alert('免费版一次只能处理 1 张图片,升级会员可批量处理 ⭐');
    files.length = 1;
    if (state.files.length >= 1) files.length = 0;
  }

  state.files = state.files.concat(files);
  controls.hidden = false;
  results.hidden = true;
  clearResults();
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

qualityInput.addEventListener('input', () => {
  qualityVal.textContent = qualityInput.value + '%';
});
processBtn.addEventListener('click', processAll);
clearBtn.addEventListener('click', () => {
  state.files = [];
  controls.hidden = true;
  results.hidden = true;
  clearResults();
});

// 导航切换(只是切换不同视图的高亮,核心逻辑共用)
document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    item.classList.add('active');
    const view = item.dataset.view;
    const map = {
      compress: '#group-quality',
      convert: '#group-format',
      watermark: '#group-watermark',
      resize: '#group-resize',
      rotate: '#group-rotate',
    };
    ['#group-quality', '#group-format', '#group-watermark', '#group-resize', '#group-rotate'].forEach((sel) => {
      $(sel).style.opacity = sel === map[view] ? '1' : '0.45';
    });
  });
});

// 会员弹窗
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

// 发卡平台购买链接 —— 拿到发卡平台的商品链接后,把下面两个网址替换掉即可
// 留空则退回显示微信收款码(手动发码)
const PAY_LINKS = {
  month: '',
  lifetime: '',
};

// 套餐按钮:配了发卡平台链接就跳过去,否则展示收款码
document.querySelectorAll('.btn-plan').forEach((btn) => {
  btn.addEventListener('click', () => {
    const plan = btn.dataset.plan;
    const link = PAY_LINKS[plan];
    if (link) {
      window.open(link, '_blank');
      return;
    }
    const amount = plan === 'lifetime' ? '¥49 终身买断' : '¥9.9 月度';
    const qrAmount = document.getElementById('qrAmount');
    const sec = document.getElementById('payQrSection');
    if (qrAmount) qrAmount.textContent = amount;
    if (sec) sec.hidden = false;
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// 初始化:先看本地 token 是否有效,再刷新 UI
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
updateRotateStatus();
updateCropStatus();
