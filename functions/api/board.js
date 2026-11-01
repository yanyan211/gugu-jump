// 菇菇跳一跳 · 排行榜就近缓存（Cloudflare Pages Function）
// 玩家打开排行榜时先找离自己最近的 Cloudflare 节点；10 秒内的重复请求直接用缓存，不用每次都跑到 Supabase。
const SUPABASE = 'https://mltzilmrptwhuxbtktet.supabase.co';
const KEY = 'sb_publishable_Y7mmTATlDdoSV-tPJ6vCTw_y9fbv6Bf';   // 公开 key，本来就在网页里
const TTL = 60;   // 秒：浏览器和 Cloudflare 都缓存 1 分钟，1 分钟内重复打开不再计入额度

let mem = null;   // 同一个节点内存里的缓存 { at, body }

export async function onRequestGet(ctx) {
  const now = Date.now();
  // ?offset=N&limit=M：查某一段名次（结算时排在 500 名以外的玩家用），不缓存
  const q = new URL(ctx.request.url).searchParams;
  if (q.has('offset')) {
    const offset = Math.max(0, parseInt(q.get('offset')) || 0), limit = Math.min(10, Math.max(1, parseInt(q.get('limit')) || 5));
    const up = await fetch(`${SUPABASE}/rest/v1/players?select=id,name,avatar,best&order=best.desc,updated_at.asc&offset=${offset}&limit=${limit}`, { headers: { apikey: KEY } });
    return new Response(await up.text(), { status: up.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (mem && now - mem.at < TTL * 1000) return reply(mem.body, 'mem');

  const cache = caches.default;
  const key = new Request(new URL(ctx.request.url).origin + '/api/board?v1');
  try { const hit = await cache.match(key); if (hit) { const body = await hit.text(); mem = { at: now, body }; return reply(body, 'edge'); } } catch (e) {}

  const up = await fetch(`${SUPABASE}/rest/v1/players?select=id,name,avatar,best&order=best.desc,updated_at.asc&limit=500`, { headers: { apikey: KEY } });
  if (!up.ok) {
    if (mem) return reply(mem.body, 'stale');   // Supabase 暂时不通：先给上次的
    return new Response(await up.text(), { status: up.status, headers: { 'content-type': 'application/json' } });
  }
  const body = await up.text();
  mem = { at: now, body };
  const res = reply(body, 'origin');
  try { ctx.waitUntil(cache.put(key, res.clone())); } catch (e) {}
  return res;
}

function reply(body, src) {
  return new Response(body, { headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=${TTL}`,
    'x-board-source': src,
  } });
}
