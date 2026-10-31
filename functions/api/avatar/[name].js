// 菇菇跳一跳 · 头像就近缓存（Cloudflare Pages Function）
// 头像文件名每次上传都不一样、不会被覆盖，所以可以放心让浏览器和 Cloudflare 长期缓存。
const SUPABASE = 'https://mltzilmrptwhuxbtktet.supabase.co';

export async function onRequestGet(ctx) {
  const name = String(ctx.params.name || '');
  if (!/^[0-9a-f-]{36}\.(jpg|png)$/i.test(name)) return new Response('not found', { status: 404 });

  const cache = caches.default;
  const key = new Request(new URL(ctx.request.url).origin + '/api/avatar/' + name);
  try { const hit = await cache.match(key); if (hit) return hit; } catch (e) {}

  const up = await fetch(`${SUPABASE}/storage/v1/object/public/avatars/${name}`);
  if (!up.ok) return new Response('not found', { status: up.status === 404 ? 404 : 502 });
  const res = new Response(up.body, { headers: {
    'content-type': up.headers.get('content-type') || 'image/jpeg',
    'cache-control': 'public, max-age=31536000, immutable',
  } });
  try { ctx.waitUntil(cache.put(key, res.clone())); } catch (e) {}
  return res;
}
