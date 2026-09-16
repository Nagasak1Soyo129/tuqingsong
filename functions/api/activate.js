// Cloudflare Pages Function:激活码校验(运行在服务器端,源码不暴露给浏览器)
// 路由:GET /api/activate?code=xxx
//
// 依赖两个环境变量(在 Cloudflare 控制台 → 项目 → Settings → Variables 里配):
//   MASTER_CODE  你的主控码(后门),可永久解锁 + 管理员标记
//   VALID_CODES  有效激活码列表,JSON 数组字符串,例:["TQS-AAAA-BBBB","TQS-CCCC-DDDD"]

export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const code = (url.searchParams.get('code') || '').trim().toUpperCase();

  if (!code) {
    return json({ ok: false, msg: '缺少激活码' }, 400);
  }

  // 1) 主控码(后门):环境变量 MASTER_CODE
  if (env.MASTER_CODE && code === String(env.MASTER_CODE).toUpperCase()) {
    return json({ ok: true, admin: true });
  }

  // 2) 有效码列表:环境变量 VALID_CODES(JSON 数组)
  let validCodes;
  try {
    validCodes = JSON.parse(env.VALID_CODES || '[]');
  } catch (e) {
    return json({ ok: false, msg: '服务器配置错误' }, 500);
  }

  if (validCodes.includes(code)) {
    return json({ ok: true });
  }

  return json({ ok: false, msg: '激活码无效' }, 400);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
