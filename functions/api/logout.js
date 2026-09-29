import { json, getUserByToken } from '../_lib/auth';

export async function onRequestPost(context) {
  const auth = await getUserByToken(context.env, context.request);
  if (auth) await context.env.USERS.delete('session:' + auth.token);
  return json({ ok: true });
}
