import {authenticateRequest} from '../../_lib/auth';
import {buildClearSessionCookie, jsonResponse} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const {request, env} = context;
  const auth = await authenticateRequest(env.DB, request);

  if (!auth) {
    return jsonResponse(
      {ok: false, authenticated: false, user: null},
      401,
      {'Set-Cookie': buildClearSessionCookie(request)},
    );
  }

  return jsonResponse({
    ok: true,
    authenticated: true,
    sessionId: auth.sessionId,
    expiresAt: auth.expiresAt,
    user: auth.user,
  });
}
