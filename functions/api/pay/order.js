// Cloudflare Pages Function:创建支付订单(需登录)
// 路由:POST /api/pay/order   body: { plan: 'month' | 'lifetime' }
// 依赖环境变量:
//   XH_APPID        虎皮椒支付渠道 APPID
//   XH_SECRET       虎皮椒支付渠道 SECRET
//   XH_GATEWAY      (可选)网关地址,默认 https://api.xunhupay.com
//   XH_MONTH_FEE    (可选)月度价格,默认 9.90
//   XH_LIFETIME_FEE (可选)终身价格,默认 49.00
// 存储:KV `order:{tradeOrderId}` = { tradeOrderId, username, plan, fee, status, createdAt }

import { json, getUserByToken, randomHex } from '../../_lib/auth';
import { sign, nonceStr } from '../../_lib/xunhu';

const PLANS = {
  month: '图轻松 月度会员',
  lifetime: '图轻松 终身会员',
};

export async function onRequestPost(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);
  if (auth.user.premium) return json({ ok: false, msg: '你已是会员,无需重复购买' }, 400);

  let body = {};
  try { body = await request.json(); } catch {}
  const title = PLANS[body.plan];
  if (!title) return json({ ok: false, msg: '套餐无效' }, 400);

  const appid = env.XH_APPID;
  const secret = env.XH_SECRET;
  const gateway = String(env.XH_GATEWAY || 'https://api.xunhupay.com').replace(/\/+$/, '');
  if (!appid || !secret) return json({ ok: false, msg: '支付未配置(缺 XH_APPID/XH_SECRET)' }, 500);

  const fee = body.plan === 'lifetime' ? String(env.XH_LIFETIME_FEE || '49.00') : String(env.XH_MONTH_FEE || '9.90');
  const tradeOrderId = 'TQS' + Date.now() + randomHex(4).toUpperCase();
  const base = new URL(request.url);
  const notifyUrl = base.origin + '/api/pay/notify';
  const returnUrl = base.origin + '/';

  const params = {
    version: '1.1',
    appid,
    trade_order_id: tradeOrderId,
    total_fee: fee,
    title,
    time: String(Math.floor(Date.now() / 1000)),
    notify_url: notifyUrl,
    return_url: returnUrl,
    nonce_str: nonceStr(16),
  };
  params.hash = sign(params, secret);

  await env.USERS.put('order:' + tradeOrderId, JSON.stringify({
    tradeOrderId,
    username: auth.user.username,
    plan: body.plan,
    fee,
    status: 'pending',
    createdAt: Date.now(),
  }));

  try {
    const res = await fetch(gateway + '/payment/do.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.errcode === 0) {
      return json({ ok: true, tradeOrderId, url: data.url || data.url_qrcode || '' });
    }
    return json({ ok: false, msg: data.errmsg || '下单失败' }, 500);
  } catch (e) {
    return json({ ok: false, msg: '支付网关不可用' }, 500);
  }
}
