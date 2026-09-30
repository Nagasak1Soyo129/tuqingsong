// Cloudflare Pages Function:创建支付订单(需登录)
// 路由:POST /api/pay/order   body: { plan: 'month' | 'quarter' | 'halfyear' | 'year' }
// 依赖环境变量:
//   XH_APPID        虎皮椒支付渠道 APPID
//   XH_SECRET       虎皮椒支付渠道 SECRET
//   XH_GATEWAY      (可选)网关地址,默认 https://api.xunhupay.com
// 存储:KV `order:{tradeOrderId}` = { tradeOrderId, username, plan, fee, days, status, createdAt }

import { json, getUserByToken, randomHex } from '../../_lib/auth';
import { sign, nonceStr } from '../../_lib/xunhu';

const PLANS = {
  month:    { title: '图轻松 月度会员', fee: '9.90',  days: 30 },
  quarter:  { title: '图轻松 季度会员', fee: '16.60', days: 90 },
  halfyear: { title: '图轻松 半年会员', fee: '24.40', days: 180 },
  year:     { title: '图轻松 年度会员', fee: '36.60', days: 365 },
};

export async function onRequestPost(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);
  if (auth.user.premium === true) return json({ ok: false, msg: '你已是终身会员,无需重复购买' }, 400);

  let body = {};
  try { body = await request.json(); } catch {}
  const plan = PLANS[body.plan];
  if (!plan) return json({ ok: false, msg: '套餐无效' }, 400);

  const appid = env.XH_APPID;
  const secret = env.XH_SECRET;
  const gateway = String(env.XH_GATEWAY || 'https://api.xunhupay.com').replace(/\/+$/, '');
  if (!appid || !secret) return json({ ok: false, msg: '支付未配置(缺 XH_APPID/XH_SECRET)' }, 500);

  const tradeOrderId = 'TQS' + Date.now() + randomHex(4).toUpperCase();
  const base = new URL(request.url);
  const notifyUrl = base.origin + '/api/pay/notify';
  const returnUrl = base.origin + '/';

  const params = {
    version: '1.1',
    appid,
    trade_order_id: tradeOrderId,
    total_fee: plan.fee,
    title: plan.title,
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
    fee: plan.fee,
    days: plan.days,
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
