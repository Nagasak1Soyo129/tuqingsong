// Cloudflare Pages Function:轻量访问统计(公开接口,无需登录)
// 路由:POST /api/track   body: { kind: 'pv' | 'use', tool?: string, ref?: string, uv?: boolean }
// 存储:KV `stat:{YYYY-MM-DD}` = { pv, uv, refs: {来源:次数}, tools: {工具:次数} }
//
// 设计取舍(重要,别当它是专业统计):
//   - 用 KV 存,而 KV **没有原子自增**,并发下是「读-改-写」,高并发会丢计数。
//     低流量站点够用;真做大了请换成 Cloudflare Web Analytics(免费且无限额)。
//   - KV 免费额度 **1000 次写/天**,即每天最多记录约 1000 个事件。
//     这是个硬上限 —— 真被刷到上限说明站点起来了,那时该换正经方案。
//   - 不收集 IP、不写 Cookie、不存任何可识别个人的信息,只记「来源」和「用了哪个工具」。

import { json } from '../_lib/auth';

// 把 referrer 归类成可读来源,用来判断哪个渠道真的带来了人
function classifyRef(ref, selfHost) {
  if (!ref) return '直接访问';
  let h = '';
  try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch { return '其他'; }
  if (h === selfHost) return '站内跳转';
  const rules = [
    [/xiaohongshu|xhslink|xhs\.link/i, '小红书'],
    [/zhihu/i, '知乎'],
    [/weixin|wechat|qq\.com|qzone/i, '微信/QQ'],
    [/baidu/i, '百度'],
    [/bing/i, '必应'],
    [/google/i, '谷歌'],
    [/sogou/i, '搜狗'],
    [/so\.com|360/i, '360搜索'],
    [/weibo/i, '微博'],
    [/douyin|iesdouyin/i, '抖音'],
    [/kuaishou/i, '快手'],
    [/bilibili|b23\.tv/i, 'B站'],
    [/v2ex/i, 'V2EX'],
    [/github/i, 'GitHub'],
    [/jike|okjike/i, '即刻'],
    [/sspai/i, '少数派'],
    [/toutiao/i, '今日头条'],
  ];
  for (const [re, name] of rules) if (re.test(h)) return name;
  return h.slice(0, 40);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  // 简单防滥用:只接受来自本站页面的请求,挡掉随手 curl 刷计数
  const refHeader = request.headers.get('Referer') || '';
  let refHost = '';
  try { refHost = new URL(refHeader).hostname; } catch {}
  if (refHost && refHost !== url.hostname) return json({ ok: false }, 403);

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false }, 400);

  const kind = body.kind === 'use' ? 'use' : 'pv';
  const tool = String(body.tool || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
  const source = classifyRef(String(body.ref || ''), url.hostname);

  const day = new Date().toISOString().slice(0, 10);
  const key = 'stat:' + day;

  let s = { pv: 0, uv: 0, refs: {}, tools: {} };
  const raw = await env.USERS.get(key);
  if (raw) { try { s = JSON.parse(raw); } catch {} }
  s.pv = (s.pv || 0) + 1;
  s.refs = s.refs || {};
  s.tools = s.tools || {};

  if (kind === 'use') {
    if (tool) s.tools[tool] = (s.tools[tool] || 0) + 1;
  } else {
    s.refs[source] = (s.refs[source] || 0) + 1;
    if (body.uv) s.uv = (s.uv || 0) + 1;
  }

  await env.USERS.put(key, JSON.stringify(s));
  return json({ ok: true });
}
