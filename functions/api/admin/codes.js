// Cloudflare Pages Function:管理员查看已生成的激活码(GET,需管理员登录)
// 路由:GET /api/admin/codes

import { json, getUserByToken } from '../../_lib/auth';

export async function onRequestGet(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);
  if (!auth.user.admin) return json({ ok: false, msg: '无权限' }, 403);

  const list = await env.USERS.list({ prefix: 'code:' });
  const codes = [];
  for (const k of list.keys) {
    const raw = await env.USERS.get(k.name);
    if (raw) {
      try { codes.push(JSON.parse(raw)); } catch {}
    }
  }
  codes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return json({ ok: true, codes });
}
