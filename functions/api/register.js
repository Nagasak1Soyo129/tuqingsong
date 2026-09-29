import { json, randomHex, normalizeUsername, hashPassword, publicUser, createSession } from '../_lib/auth';

export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await request.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const password = String(body?.password || '');

  if (username.length < 2) return json({ ok: false, msg: '用户名至少 2 个字符' }, 400);
  if (password.length < 6) return json({ ok: false, msg: '密码至少 6 位' }, 400);

  if (await env.USERS.get('user:' + username)) {
    return json({ ok: false, msg: '该用户名已被注册' }, 409);
  }

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const user = { username, salt, hash, premium: false, admin: false, createdAt: Date.now() };
  await env.USERS.put('user:' + username, JSON.stringify(user));

  const token = await createSession(env, username);
  return json({ ok: true, token, user: publicUser(user) });
}
