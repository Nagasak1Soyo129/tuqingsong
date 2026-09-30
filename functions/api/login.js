import { json, normalizeUsername, normalizeEmail, hashPassword, publicUser, createSession } from '../_lib/auth';

export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await request.json().catch(() => null);
  const input = String(body?.username || '').trim();
  const password = String(body?.password || '');

  if (!input || !password) return json({ ok: false, msg: '请输入用户名/邮箱和密码' }, 400);

  // 支持用户名或邮箱登录:含 @ 视为邮箱,走邮箱索引解析
  let username = input;
  if (input.includes('@')) {
    const email = normalizeEmail(input);
    const resolved = await env.USERS.get('email:' + email);
    if (!resolved) return json({ ok: false, msg: '用户名或密码错误' }, 401);
    username = resolved;
  } else {
    username = normalizeUsername(input);
  }

  const raw = await env.USERS.get('user:' + username);
  if (!raw) return json({ ok: false, msg: '用户名或密码错误' }, 401);
  const user = JSON.parse(raw);

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.hash) return json({ ok: false, msg: '用户名或密码错误' }, 401);

  const token = await createSession(env, username);
  return json({ ok: true, token, user: publicUser(user) });
}
