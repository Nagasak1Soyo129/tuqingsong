// Cloudflare Pages Function:虎皮椒支付回调(服务器到服务器,无需登录)
// 路由:POST /api/pay/notify(下单时作为 notify_url 传入)
// 流程:验签 → 校验金额 → 幂等去重 → 标记订单已支付 → 自动开通会员
// 成功时返回字符串 "success"

import { sign } from '../../_lib/xunhu';

export async function onRequestPost(context) {
  const { env, request } = context;
  const secret = env.XH_SECRET || '';

  let params;
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      params = await request.json();
    } else {
      params = Object.fromEntries(new URLSearchParams(await request.text()).entries());
    }
  } catch {
    return new Response('fail');
  }
  if (!params) return new Response('fail');

  // 验签
  const hash = params.hash;
  if (!hash || sign(params, secret) !== String(hash).toLowerCase()) {
    return new Response('fail');
  }

  // 只处理支付成功
  if (params.status !== 'OD') return new Response('success');

  const tradeOrderId = params.trade_order_id;
  const rawOrder = await env.USERS.get('order:' + tradeOrderId);
  if (!rawOrder) return new Response('fail');
  let order;
  try { order = JSON.parse(rawOrder); } catch { return new Response('fail'); }

  // 幂等:已处理过直接成功返回,避免重复开通
  if (order.status === 'paid') return new Response('success');

  // 校验金额,防篡改(按数值比较,兼容 9.9 / 9.90 之类格式差异)
  if (Math.abs(parseFloat(params.total_fee) - parseFloat(order.fee)) > 0.001) return new Response('fail');

  order.status = 'paid';
  order.paidAt = Date.now();
  await env.USERS.put('order:' + tradeOrderId, JSON.stringify(order));

  // 自动开通/续费会员(终身会员无需处理)
  const rawUser = await env.USERS.get('user:' + order.username);
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      if (user.premium !== true) {
        const days = Number(order.days) || 30;
        const base = Math.max(Date.now(), Number(user.premiumUntil) || 0);
        user.premiumUntil = base + days * 86400000;
        await env.USERS.put('user:' + order.username, JSON.stringify(user));
      }
    } catch {}
  }

  return new Response('success');
}
