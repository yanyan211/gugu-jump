// 菇菇跳一跳 · 提交分数 / 改资料 / 查重名 的转发（Cloudflare Pages Function）
// 国内（尤其微信里）直连 Supabase 经常失败，经由同域名的 Cloudflare 转发更稳。
const SUPABASE = 'https://mltzilmrptwhuxbtktet.supabase.co';
const KEY = 'sb_publishable_Y7mmTATlDdoSV-tPJ6vCTw_y9fbv6Bf';
const ALLOWED = new Set(['submit_score', 'update_profile', 'name_available', 'set_password', 'login_account']);

export async function onRequestPost(ctx) {
  const fn = String(ctx.params.fn || '');
  if (!ALLOWED.has(fn)) return new Response('not found', { status: 404 });
  const body = await ctx.request.text();
  if (body.length > 4096) return new Response('too large', { status: 413 });
  const up = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST', body,
    headers: { apikey: KEY, 'content-type': 'application/json' },
  });
  return new Response(await up.text(), { status: up.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
