// Cloudflare Pages Function:查询订单支付状态(需登录,供前端轮询)
// 路由:GET /api/pay/status?trade_order_id=xxx

import { json, getUserByToken } from '../../_lib/auth';

export async function onRequestGet(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);

  const tradeOrderId = new URL(request.url).searchParams.get('trade_order_id');
  if (!tradeOrderId) return json({ ok: false, msg: '缺少订单号' }, 400);

  const raw = await env.USERS.get('order:' + tradeOrderId);
  if (!raw) return json({ ok: false, msg: '订单不存在' }, 404);
  const order = JSON.parse(raw);
  if (order.username !== auth.user.username) return json({ ok: false, msg: '无权查看' }, 403);

  return json({ ok: true, status: order.status, plan: order.plan });
}
