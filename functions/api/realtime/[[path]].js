// 菇菇跳一跳 · 好友房间的实时连接中转（Cloudflare Pages Function）
// 国内网络直连 Supabase 的 WebSocket 经常连不上，这里由 Cloudflare 帮忙转一手。
// 每条连接只算 1 次请求，连接里来回发的消息不计入额度。
const UPSTREAM = 'https://mltzilmrptwhuxbtktet.supabase.co/realtime/v1/';

export async function onRequest({ request, params }) {
  if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket')
    return new Response('websocket only', { status: 426 });
  const path = [].concat(params.path || []).join('/');
  const url = UPSTREAM + path + new URL(request.url).search;
  return fetch(url, request);
}
