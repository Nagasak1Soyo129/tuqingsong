import { json, getUserByToken, publicUser } from '../_lib/auth';

export async function onRequestGet(context) {
  const auth = await getUserByToken(context.env, context.request);
  if (!auth) return json({ ok: false, msg: '未登录' }, 401);
  return json({ ok: true, user: publicUser(auth.user) });
}
