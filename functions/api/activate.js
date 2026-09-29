// Cloudflare Pages Function:激活码校验 + 升级账号(需先登录)
// 路由:GET /api/activate?code=xxx
// 依赖环境变量:
//   MASTER_CODE  主控码(后门),激活后账号标记为管理员
//   VALID_CODES  有效激活码列表,任意分隔(换行/逗号/空格/分号)
// 存储:Cloudflare KV(绑定名 USERS)

import { json, getUserByToken, publicUser } from '../_lib/auth';

// 归一化:统一转大写,只保留字母数字和横杠(剥掉引号/方括号/空格等干扰字符)
function normalize(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export async function onRequestGet(context) {
  const { env, request } = context;

  const auth = await getUserByToken(env, request);
  if (!auth) return json({ ok: false, msg: '请先登录账号' }, 401);

  const code = normalize(new URL(request.url).searchParams.get('code'));
  if (!code) return json({ ok: false, msg: '缺少激活码' }, 400);

  let admin = false;
  if (env.MASTER_CODE && code === normalize(env.MASTER_CODE)) {
    admin = true;
  } else {
    const validCodes = String(env.VALID_CODES || '')
      .split(/[\s,;，；]+/)
      .map(normalize)
      .filter(Boolean);
    if (!validCodes.includes(code)) return json({ ok: false, msg: '激活码无效' }, 400);
  }

  // 把会员/管理员标记写入账号(持久化,跨设备生效)
  auth.user.premium = true;
  if (admin) auth.user.admin = true;
  await env.USERS.put('user:' + auth.user.username, JSON.stringify(auth.user));

  return json({ ok: true, admin, user: publicUser(auth.user) });
}
