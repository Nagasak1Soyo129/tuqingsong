// Cloudflare Pages Function:管理员查看访问统计(GET,需管理员登录)
// 路由:GET /api/admin/stats
// 返回:最近 30 天逐日数据 + 汇总(来源分布、工具使用分布)

import { json, getUserByToken } from '../../_lib/auth';

export async function onRequestGet(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);
  if (!auth.user.admin) return json({ ok: false, msg: '无权限' }, 403);

  const list = await env.USERS.list({ prefix: 'stat:' });
  const days = [];
  for (const k of list.keys) {
    const raw = await env.USERS.get(k.name);
    if (!raw) continue;
    try {
      const d = JSON.parse(raw);
      days.push({
        day: k.name.slice(5),
        pv: d.pv || 0,
        uv: d.uv || 0,
        refs: d.refs || {},
        tools: d.tools || {},
      });
    } catch {}
  }
  // 新的在前
  days.sort((a, b) => (a.day < b.day ? 1 : -1));

  const total = { pv: 0, uv: 0 };
  const refs = {}, tools = {};
  for (const d of days) {
    total.pv += d.pv;
    total.uv += d.uv;
    for (const [k, v] of Object.entries(d.refs)) refs[k] = (refs[k] || 0) + v;
    for (const [k, v] of Object.entries(d.tools)) tools[k] = (tools[k] || 0) + v;
  }

  // 转成按次数降序的数组,前端好渲染
  const toSorted = (o) => Object.entries(o).map(([k, v]) => ({ name: k, count: v }))
    .sort((a, b) => b.count - a.count);

  return json({
    ok: true,
    total,
    refs: toSorted(refs),
    tools: toSorted(tools),
    days: days.slice(0, 30),
  });
}
