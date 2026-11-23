import {sha256Hex} from '../../_lib/crypto';
import {buildClearSessionCookie, jsonResponse, parseCookies, SESSION_COOKIE_NAME} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const {request, env} = context;
  const cookies = parseCookies(request);
  const rawToken = cookies[SESSION_COOKIE_NAME];

  if (rawToken) {
    const tokenHash = await sha256Hex(rawToken);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  return jsonResponse(
    {ok: true, message: 'Đã đăng xuất tài khoản.'},
    200,
    {'Set-Cookie': buildClearSessionCookie(request)},
  );
}
