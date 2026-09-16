// ============================================================
// 图轻松 —— 图片压缩 / 转格式 / 加水印
// 纯前端处理,图片不出浏览器,无服务器成本
// 变现:免费版 = 单张 + 强制水印 + 质量上限 80%
//       会员  = 批量 + 去水印 + 高清(质量 100%)
// ============================================================

const state = {
  files: [],       // 原始 File 列表
  premium: false,  // 是否会员
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

const upgradeBtn = $('#upgradeBtn');
const upgradeModal = $('#upgradeModal');
const closeModal = $('#closeModal');
const codeInput = $('#codeInput');
const activateBtn = $('#activateBtn');
const activateMsg = $('#activateMsg');

// ============================================================
// 会员系统(演示版,用 localStorage 存激活码)
// 正式上线时:把激活码校验接到你自己的后端 / 收款回调
// ============================================================
const ACTIVATION_KEY = 'tqs_premium';
const ADMIN_KEY = 'tqs_admin';

function isPremium() {
  return localStorage.getItem(ACTIVATION_KEY) === '1' || localStorage.getItem(ADMIN_KEY) === '1';
}
function isAdmin() {
  return localStorage.getItem(ADMIN_KEY) === '1';
}
function refreshPremiumUI() {
  state.premium = isPremium();
  if (state.premium) {
    upgradeBtn.textContent = isAdmin() ? '👑 管理员' : '👑 已开通会员';
    upgradeBtn.style.background = 'linear-gradient(135deg, var(--ok), #2bb673)';
  } else {
    upgradeBtn.textContent = '⭐ 升级会员';
    upgradeBtn.style.background = '';
  }
}

// 激活:调用后端 /api/activate 校验(激活码不再写死在网页里,别人看不到也破解不了)
async function activateCode() {
  const code = codeInput.value.trim();
  if (!code) { showMsg('请输入激活码', false); return; }
  activateBtn.disabled = true;
  try {
    const res = await fetch('/api/activate?code=' + encodeURIComponent(code));
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(ACTIVATION_KEY, '1');
      if (data.admin) localStorage.setItem(ADMIN_KEY, '1');
      showMsg(data.admin ? '👑 主控激活成功(管理员模式)' : '✅ 激活成功,会员已生效!', true);
      refreshPremiumUI();
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
function loadFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
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

// 超长边上限:超大图在手机上 canvas 会内存溢出导致出图失败,按比例缩小
const MAX_DIM = 4096;

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

  // 超大图按比例缩小,避免移动端 canvas 内存溢出
  let drawW = origW, drawH = origH;
  if (Math.max(origW, origH) > MAX_DIM) {
    const scale = MAX_DIM / Math.max(origW, origH);
    drawW = Math.round(origW * scale);
    drawH = Math.round(origH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = drawW;
  canvas.height = drawH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, drawW, drawH);

  drawWatermark(ctx, drawW, drawH, wmText);

  // 用 blob 而非 dataURL:预览图(blob URL)手机更稳,下载/分享也能直接用
  const mime = formatSel.value;
  const blob = await canvasToBlob(canvas, mime, quality);
  if (!blob) throw new Error('生成图片失败,可能图片过大');
  const url = URL.createObjectURL(blob);
  const outSize = blob.size;

  const savedBytes = origSize - outSize;
  const savedPct = Math.round((savedBytes / origSize) * 100);

  return { img, blob, url, outSize, file, origSize, origW, origH, savedBytes, savedPct, mime };
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
// 渲染结果
// ============================================================
function renderResult(item, index) {
  const div = document.createElement('div');
  div.className = 'result-item';

  const base = item.file.name.replace(/\.[^.]+$/, '');
  const outName = base + '_压缩.' + extFromMime(item.mime);

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
    // 高亮对应控制组,其余置灰
    const map = { compress: '#group-quality', convert: '#group-format', watermark: '#group-watermark' };
    ['#group-quality', '#group-format', '#group-watermark'].forEach((sel) => {
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

// 套餐按钮:上线后跳转收款链接,这里先提示
document.querySelectorAll('.btn-plan').forEach((btn) => {
  btn.addEventListener('click', () => {
    const plan = btn.dataset.plan;
    const amount = plan === 'lifetime' ? '¥49 终身买断' : '¥9.9 月度';
    const qrAmount = document.getElementById('qrAmount');
    const sec = document.getElementById('payQrSection');
    if (qrAmount) qrAmount.textContent = amount;
    if (sec) sec.hidden = false;
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// 初始化
refreshPremiumUI();
