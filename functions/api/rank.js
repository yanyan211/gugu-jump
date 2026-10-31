// 菇菇跳一跳 · 查某个玩家的名次（Cloudflare Pages Function）
// /api/rank?id=玩家ID  →  { found, best, rank, total }
const SUPABASE = 'https://mltzilmrptwhuxbtktet.supabase.co';
const KEY = 'sb_publishable_Y7mmTATlDdoSV-tPJ6vCTw_y9fbv6Bf';
const H = { apikey: KEY };

async function count(query) {
  const r = await fetch(`${SUPABASE}/rest/v1/players?select=id&${query}`, { method: 'HEAD', headers: { ...H, Prefer: 'count=exact' } });
  const m = (r.headers.get('content-range') || '').match(/\/(\d+)/);
  return m ? +m[1] : null;
}

export async function onRequestGet(ctx) {
  const id = new URL(ctx.request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'bad id' }, 400);
  const r = await fetch(`${SUPABASE}/rest/v1/players?select=best,updated_at&id=eq.${id}`, { headers: H });
  const rows = r.ok ? await r.json() : [];
  const total = await count('limit=1');
  if (!rows.length) return json({ found: false, total });
  const { best, updated_at } = rows[0];
  const ahead = await count(`or=(best.gt.${best},and(best.eq.${best},updated_at.lt.${encodeURIComponent(updated_at)}))`);
  return json({ found: true, best, rank: ahead == null ? null : ahead + 1, total });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
