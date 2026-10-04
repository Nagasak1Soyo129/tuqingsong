// Cloudflare Pages Function:创建支付订单(需登录)
// 路由:POST /api/pay/order   body: { plan: 'month' | 'quarter' | 'halfyear' | 'year' }
// 依赖环境变量:
//   XH_APPID        虎皮椒支付渠道 APPID
//   XH_SECRET       虎皮椒支付渠道 SECRET
//   XH_GATEWAY      (可选)网关地址,默认 https://api.xunhupay.com
// 存储:KV `order:{tradeOrderId}` = { tradeOrderId, username, plan, fee, days, status, createdAt }

import { json, getUserByToken, randomHex, tuPlanEligible, hasLapsed } from '../../_lib/auth';
import { sign, nonceStr } from '../../_lib/xunhu';

// title 会显示在支付平台的账单上,刻意用「支持」的说法,弱化商业感
//
// 说明:虎皮椒是聚合支付,只做一次性收款,**不支持委托代扣**,
// 所以这里所有档位都是「一次性付 N 天」,没有真正的自动续费。
// 包月(month5)与单月(month)天数相同、只是价格不同 —— 前者靠到期提醒+一键续费
// 来近似「连续包月」的体验,不靠自动扣款。
const PLANS = {
  month5:   { title: '图轻松 包月',     fee: '5.50',  days: 30 },
  month:    { title: '图轻松 单月',     fee: '9.90',  days: 30 },
  quarter:  { title: '图轻松 支持3个月', fee: '16.60', days: 90 },
  halfyear: { title: '图轻松 支持6个月', fee: '24.40', days: 180 },
  year:     { title: '图轻松 支持1年',   fee: '36.60', days: 365 },
};

export async function onRequestPost(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录' }, 401);
  if (auth.user.premium === true) return json({ ok: false, msg: '你已经是我们的长期支持者了,无需再次支持' }, 400);

  let body = {};
  try { body = await request.json(); } catch {}
  const plan = PLANS[body.plan];
  if (!plan) return json({ ok: false, msg: '套餐无效' }, 400);

  // TU Plan 价只给「连续支持」的用户。必须在服务端拦 ——
  // 只在前端隐藏按钮的话,改一下请求就能用 ¥5.5 买到。
  if (body.plan === 'month5' && hasLapsed(auth.user)) {
    return json({
      ok: false,
      msg: 'TU Plan 价只对连续支持有效,你的支持已中断,恢复需按单月 ¥9.9 续。',
    }, 400);
  }

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
