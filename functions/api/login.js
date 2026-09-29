import { json, normalizeUsername, hashPassword, publicUser, createSession } from '../_lib/auth';

export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await request.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const password = String(body?.password || '');

  if (!username || !password) return json({ ok: false, msg: '请输入用户名和密码' }, 400);

  const raw = await env.USERS.get('user:' + username);
  if (!raw) return json({ ok: false, msg: '用户名或密码错误' }, 401);
  const user = JSON.parse(raw);

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.hash) return json({ ok: false, msg: '用户名或密码错误' }, 401);

  const token = await createSession(env, username);
  return json({ ok: true, token, user: publicUser(user) });
}
