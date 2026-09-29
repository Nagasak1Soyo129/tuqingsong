// Cloudflare Pages Function:管理员生成激活码(POST,需管理员登录)
// 路由:POST /api/admin/generate   body: { count, note }
// 存储:KV `code:{CODE}` = { code, note, createdBy, createdAt, usedBy, usedAt }

import { json, getUserByToken, randomCode } from '../../_lib/auth';

export async function onRequestPost(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);
  if (!auth.user.admin) return json({ ok: false, msg: '无权限' }, 403);

  let body = {};
  try { body = await request.json(); } catch {}

  const count = Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 50);
  const note = String(body.note || '').slice(0, 100);

  const now = Date.now();
  const created = [];
  for (let i = 0; i < count; i++) {
    const code = randomCode();
    await env.USERS.put('code:' + code, JSON.stringify({
      code,
      note,
      createdBy: auth.user.username,
      createdAt: now,
      usedBy: null,
      usedAt: null,
    }));
    created.push(code);
  }
  return json({ ok: true, codes: created });
}
