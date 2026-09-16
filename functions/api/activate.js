// Cloudflare Pages Function:激活码校验(运行在服务器端,源码不暴露给浏览器)
// 路由:GET /api/activate?code=xxx
//
// 依赖两个环境变量(在 Cloudflare 控制台 → 项目 → Settings → Variables 里配):
//   MASTER_CODE  你的主控码(后门),可永久解锁 + 管理员标记
//   VALID_CODES  有效激活码列表,支持任意分隔(换行/逗号/空格/分号),也兼容 JSON 数组格式

// 归一化:统一转大写,只保留字母数字和横杠(剥掉引号/方括号/空格等干扰字符)
function normalize(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export async function onRequestGet(context) {
  const { env } = context;
  const code = normalize(new URL(context.request.url).searchParams.get('code'));

  if (!code) {
    return json({ ok: false, msg: '缺少激活码' }, 400);
  }

  // 1) 主控码(后门):环境变量 MASTER_CODE
  if (env.MASTER_CODE && code === normalize(env.MASTER_CODE)) {
    return json({ ok: true, admin: true });
  }

  // 2) 有效码列表:环境变量 VALID_CODES,任意格式都能解析
  const validCodes = String(env.VALID_CODES || '')
    .split(/[\s,;，；]+/)
    .map(normalize)
    .filter(Boolean);

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
