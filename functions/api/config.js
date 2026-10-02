// Cloudflare Pages Function:返给前端的运行配置(含 A/B 分组)
// 路由:GET /api/config
//
// A/B 测试怎么做才可信:
//   访客第一次进来时随机 50/50 分成 a / b 两组,用 cookie 记住 60 天。
//   之后他每次访问都看到同一套模式(不会来回变,那样体验很怪)。
//   因为分组是随机的,两组访客统计上等价,转化率差异才能归因到「模式」本身。
//
//   反例:如果开两个站各发各的链接,两组人的来源和时间都不同,
//   差异可能来自「这批人本来就更愿意花钱」,结论不可信。
//
// 改模式差异:只改下面的 MODES 就行。

import { json } from '../_lib/auth';

const MODES = {
  // A 组:软性支持(现在的样子)
  soft: {
    label: '支持者',
    cta: '请支持我们',        // 顶栏按钮
    ctaDone: '感谢支持',
    qualityCap: 0.8,          // 免费版质量上限
    fileLimit: 1,             // 免费版单次文件数
    locked: ['collage', 'pdfmerge'],   // 免费版锁住的工具
    pitch: '图轻松一直免费、无广告、图片不上传服务器。如果它帮到了你,欢迎请我们喝杯咖啡。',
    note: '支持后,以下功能会一并解锁 —— 算是我们的一点谢意',
  },
  // B 组:硬性会员(锁更多、限额更低、话术更直接)
  hard: {
    label: '会员',
    cta: '升级会员',
    ctaDone: '已开通会员',
    qualityCap: 0.7,
    fileLimit: 1,
    locked: ['collage', 'pdfmerge', 'pdfwatermark', 'pdfstamp', 'pdfpages', 'adjust'],
    pitch: '免费版限制较多。升级会员即可解锁全部 16 个工具、批量处理与高清输出。',
    note: '会员可解锁以下全部功能',
  },
};

export async function onRequestGet(context) {
  const { request, env } = context;

  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)tqs_ab=([ab])/);
  let bucket = m ? m[1] : '';
  let isNew = false;

  // 首次访问:随机分组
  if (!bucket) {
    bucket = Math.random() < 0.5 ? 'a' : 'b';
    isNew = true;
  }

  const modeName = bucket === 'b' ? 'hard' : 'soft';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', // 含分组信息,绝不能被缓存
  };
  if (isNew) {
    // 60 天;SameSite=Lax 保证从外站点进来也带得上
    headers['Set-Cookie'] = `tqs_ab=${bucket}; Path=/; Max-Age=${60 * 60 * 24 * 60}; SameSite=Lax`;
  }

  // 记一次分组曝光(仅在首次分组时写一次,不加重 KV 负担)
  if (isNew) {
    const day = new Date().toISOString().slice(0, 10);
    const key = 'ab:' + day;
    let s = {};
    try { s = JSON.parse((await env.USERS.get(key)) || '{}'); } catch {}
    s[bucket] = (s[bucket] || 0) + 1;
    await env.USERS.put(key, JSON.stringify(s));
  }

  return new Response(JSON.stringify({
    ok: true,
    bucket,
    mode: modeName,
    modes: MODES,
  }), { status: 200, headers });
}
