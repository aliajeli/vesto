import { destroySession, getCurrentUser, clientMeta } from '@/lib/auth';
import { ok, handleError, assertSameOrigin } from '@/lib/api';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await assertSameOrigin();
    const user = await getCurrentUser();
    const meta = await clientMeta();
    await destroySession();
    if (user) {
      await logAudit({ userId: user.id, actorName: user.name, action: 'خروج از حساب', entity: 'Auth', ip: meta.ip, userAgent: meta.userAgent });
    }
    return ok();
  } catch (e) {
    return handleError(e);
  }
}
