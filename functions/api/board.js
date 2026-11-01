// 菇菇跳一跳 · 排行榜（Cloudflare Pages Function）
// 每天北京时间 0:00 更新一次：当天第一次有人打开时去 Supabase 拿一份，之后一整天都用这份，
// 手机浏览器也会缓存到当天 0 点，重复打开既不去 Supabase，也不计 Cloudflare 的请求次数。
const SUPABASE = 'https://mltzilmrptwhuxbtktet.supabase.co';
const KEY = 'sb_publishable_Y7mmTATlDdoSV-tPJ6vCTw_y9fbv6Bf';   // 公开 key，本来就在网页里
const TZ = 8 * 3600 * 1000;   // 北京时间

let mem = null;   // 同一个节点内存里的缓存 { day, body }

// 今天是第几天（北京时间），以及离下一个 0 点还有多少秒
function today(now) {
  const day = Math.floor((now + TZ) / 86400000);
  const left = Math.ceil(((day + 1) * 86400000 - TZ - now) / 1000);
  return { day, left: Math.max(60, left) };
}

export async function onRequestGet(ctx) {
  const now = Date.now();
  const q = new URL(ctx.request.url).searchParams;
  // ?offset=N&limit=M：查某一段实时名次（结算时核对名次用），不缓存
  if (q.has('offset')) {
    const offset = Math.max(0, parseInt(q.get('offset')) || 0), limit = Math.min(10, Math.max(1, parseInt(q.get('limit')) || 5));
    const up = await fetch(`${SUPABASE}/rest/v1/players?select=id,name,avatar,best&order=best.desc,updated_at.asc&offset=${offset}&limit=${limit}`, { headers: { apikey: KEY } });
    return new Response(await up.text(), { status: up.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
  const { day, left } = today(now);
  if (mem && mem.day === day) return reply(mem.body, 'mem', left, day);

  const cache = caches.default;
  const key = new Request(new URL(ctx.request.url).origin + '/api/board?day=' + day);
  try { const hit = await cache.match(key); if (hit) { const body = await hit.text(); mem = { day, body }; return reply(body, 'edge', left, day); } } catch (e) {}

  const up = await fetch(`${SUPABASE}/rest/v1/players?select=id,name,avatar,best&order=best.desc,updated_at.asc&limit=500`, { headers: { apikey: KEY } });
  if (!up.ok) {
    if (mem) return reply(mem.body, 'stale', 300, mem.day);   // Supabase 暂时不通：先给上次的，5 分钟后再试
    return new Response(await up.text(), { status: up.status, headers: { 'content-type': 'application/json' } });
  }
  const body = await up.text();
  mem = { day, body };
  const res = reply(body, 'origin', left, day);
  try { ctx.waitUntil(cache.put(key, res.clone())); } catch (e) {}
  return res;
}

function reply(body, src, maxAge, day) {
  return new Response(body, { headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=${maxAge}`,
    'x-board-source': src,
    'x-board-day': String(day),
  } });
}
