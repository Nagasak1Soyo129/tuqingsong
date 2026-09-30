// Cloudflare Pages Function:激活码校验 + 升级账号(需先登录)
// 路由:GET /api/activate?code=xxx
// 校验顺序:
//   1) MASTER_CODE  主控码(后门),激活后账号标记为管理员
//   2) KV `code:{CODE}` 后台生成的一次性激活码(一码一用,激活即作废)
//   3) VALID_CODES  旧版批量码(环境变量,可复用)
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
    // 1) 优先查后台生成的一次性激活码(KV),一码一用
    const rawCode = await env.USERS.get('code:' + code);
    if (rawCode) {
      let rec;
      try { rec = JSON.parse(rawCode); } catch { rec = null; }
      if (!rec) return json({ ok: false, msg: '激活码无效' }, 400);
      if (rec.usedBy) return json({ ok: false, msg: '激活码已被使用' }, 400);
      rec.usedBy = auth.user.username;
      rec.usedAt = Date.now();
      await env.USERS.put('code:' + code, JSON.stringify(rec));
    } else {
      // 2) 旧版批量码(环境变量 VALID_CODES),仍然有效
      const validCodes = String(env.VALID_CODES || '')
        .split(/[\s,;，；]+/)
        .map(normalize)
        .filter(Boolean);
      if (!validCodes.includes(code)) return json({ ok: false, msg: '激活码无效' }, 400);
    }
  }

  // 把支持者/管理员标记写入账号(持久化,跨设备生效)
  auth.user.premium = true;
  if (admin) auth.user.admin = true;
  await env.USERS.put('user:' + auth.user.username, JSON.stringify(auth.user));

  return json({ ok: true, admin, user: publicUser(auth.user) });
}
