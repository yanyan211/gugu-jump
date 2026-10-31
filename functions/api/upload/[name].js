// 菇菇跳一跳 · 头像上传转发（Cloudflare Pages Function）
const SUPABASE = 'https://mltzilmrptwhuxbtktet.supabase.co';
const KEY = 'sb_publishable_Y7mmTATlDdoSV-tPJ6vCTw_y9fbv6Bf';

export async function onRequestPost(ctx) {
  const name = String(ctx.params.name || '');
  if (!/^[0-9a-f-]{36}\.(jpg|png)$/i.test(name)) return new Response('bad name', { status: 400 });
  const type = ctx.request.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png)$/.test(type)) return new Response('bad type', { status: 415 });
  const buf = await ctx.request.arrayBuffer();
  if (buf.byteLength > 300 * 1024) return new Response('too large', { status: 413 });
  const up = await fetch(`${SUPABASE}/storage/v1/object/avatars/${name}`, {
    method: 'POST', body: buf,
    headers: { apikey: KEY, 'content-type': type, 'cache-control': 'max-age=31536000' },
  });
  return new Response(await up.text(), { status: up.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
