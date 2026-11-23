import {authenticateRequest, recalculateAndPersistGoalBalances} from '../../../_lib/auth';
import {errorResponse, isSafeWebhookUrl, jsonResponse, parseJsonBody} from '../../../_lib/security';
import {PagesContext} from '../../../_lib/types';

export async function onRequestPatch(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã giao dịch gửi tiết kiệm.', 400);

  const existing = await context.env.DB.prepare(
    'SELECT * FROM savings_deposits WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(id, auth.user.id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return errorResponse('Không tìm thấy giao dịch gửi tiết kiệm thuộc tài khoản của bạn.', 404);
  }

  const body = await parseJsonBody<{
    action?: 'confirm_manual' | 'mark_failed' | 'reconcile_webhook';
    webhookUrl?: string;
  }>(context.request);

  if (!body || !body.action) {
    return errorResponse('Hành động xử lý không hợp lệ.', 400);
  }

  const nowIso = new Date().toISOString();

  if (body.action === 'confirm_manual') {
    await context.env.DB.prepare(
      `UPDATE savings_deposits
       SET payment_status = 'confirmed', verification_method = 'manual_unverified', verified_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(nowIso, id, auth.user.id)
      .run();
    await recalculateAndPersistGoalBalances(context.env.DB, auth.user.id);
    return jsonResponse({ok: true, status: 'confirmed', verificationMethod: 'manual_unverified', verifiedAt: nowIso});
  }

  if (body.action === 'mark_failed') {
    await context.env.DB.prepare(
      `UPDATE savings_deposits
       SET payment_status = 'failed', verified_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(nowIso, id, auth.user.id)
      .run();
    await recalculateAndPersistGoalBalances(context.env.DB, auth.user.id);
    return jsonResponse({ok: true, status: 'failed', verifiedAt: nowIso});
  }

  if (body.action === 'reconcile_webhook') {
    const rawUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : '';
    if (!rawUrl || !isSafeWebhookUrl(rawUrl)) {
      return errorResponse('URL Webhook/API đối soát không hợp lệ hoặc bị chặn vì lý do an toàn.', 400);
    }

    try {
      const targetUrl = new URL(rawUrl);
      targetUrl.searchParams.set('transactionCode', String(existing.transaction_code));
      targetUrl.searchParams.set('amount', String(existing.amount));

      const res = await fetch(targetUrl.toString(), {method: 'GET'});
      if (!res.ok) {
        return errorResponse('API đối soát ngân hàng trả về lỗi.', 502);
      }
      const data = (await res.json()) as {verified?: boolean; status?: string};
      if (data.verified === true || data.status === 'confirmed') {
        await context.env.DB.prepare(
          `UPDATE savings_deposits
           SET payment_status = 'confirmed', verification_method = 'api_webhook', verified_at = ?
           WHERE id = ? AND user_id = ?`,
        )
          .bind(nowIso, id, auth.user.id)
          .run();
        await recalculateAndPersistGoalBalances(context.env.DB, auth.user.id);
        return jsonResponse({
          ok: true,
          verified: true,
          status: 'confirmed',
          verificationMethod: 'api_webhook',
          verifiedAt: nowIso,
        });
      }
      return jsonResponse({ok: true, verified: false, status: String(existing.payment_status)});
    } catch {
      return errorResponse('Không thể kết nối đến API đối soát ngân hàng.', 502);
    }
  }

  return errorResponse('Hành động không được hỗ trợ.', 400);
}
