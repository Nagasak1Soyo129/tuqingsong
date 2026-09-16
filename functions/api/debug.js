// ⚠️ 临时调试接口:只返回"是否配置 + 数量",绝不返回码本身
// 访问:GET /api/debug  —— 排查完务必删除本文件!
export async function onRequestGet(context) {
  const { env } = context;
  const normalize = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const raw = String(env.VALID_CODES || '');
  const codes = raw.split(/[\s,;，；]+/).map(normalize).filter(Boolean);

  return new Response(
    JSON.stringify({
      masterCodeSet: Boolean(env.MASTER_CODE),
      validCodesSet: Boolean(env.VALID_CODES),
      validCodesRawLength: raw.length,
      validCodesCount: codes.length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
