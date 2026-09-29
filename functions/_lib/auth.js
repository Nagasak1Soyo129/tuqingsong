// ============================================================
// 图轻松 —— 账号系统共享工具(Cloudflare Pages Functions)
// 存储:Cloudflare KV(需在 Pages 项目里绑定名为 USERS 的 KV 命名空间)
// 密码:PBKDF2(1000 轮)+ 随机盐;会话:随机 token 存 KV,30 天有效
// ============================================================

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// 归一化用户名:去空白、转小写,只保留字母数字下划线和中文
export function normalizeUsername(s) {
  return String(s || '').trim().toLowerCase().replace(/[^\w一-龥]/g, '').slice(0, 32);
}

export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 生成一次性激活码:如 TQS-7K3M-9Q2W-X8FA(去掉易混淆的 0/O/1/I)
export function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  const s = [...arr].map((b) => chars[b % chars.length]).join('');
  return `TQS-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

// PBKDF2-SHA256 派生 256 位,hex 输出(迭代次数低以适配免费档 CPU 限制)
export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 1000, hash: 'SHA-256' },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 只暴露给前端的用户字段(绝不返回密码哈希/盐)
export function publicUser(u) {
  return { username: u.username, premium: !!u.premium, admin: !!u.admin };
}

export async function createSession(env, username) {
  const token = randomHex(32);
  await env.USERS.put('session:' + token, JSON.stringify({ username }), {
    expirationTtl: 60 * 60 * 24 * 30, // 30 天
  });
  return token;
}

// 从 Authorization: Bearer <token> 解析已登录用户;未登录返回 null
export async function getUserByToken(env, request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const rawSess = await env.USERS.get('session:' + token);
  if (!rawSess) return null;
  let sess;
  try { sess = JSON.parse(rawSess); } catch { return null; }
  const rawUser = await env.USERS.get('user:' + sess.username);
  if (!rawUser) return null;
  try { return { token, user: JSON.parse(rawUser) }; } catch { return null; }
}
