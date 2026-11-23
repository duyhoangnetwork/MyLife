import {API_SECURITY_HEADERS, errorResponse, verifyCsrfAndOrigin} from '../_lib/security';
import {PagesContext} from '../_lib/types';

export async function onRequest(context: PagesContext): Promise<Response> {
  const {request, next} = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers: API_SECURITY_HEADERS});
  }

  if (!verifyCsrfAndOrigin(request)) {
    return errorResponse('Yêu cầu không hợp lệ (CSRF / Origin không khớp).', 403);
  }

  const response = next ? await next() : new Response('Not Found', {status: 404});
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(API_SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
