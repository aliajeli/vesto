import { getCurrentUser } from '@/lib/auth';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok({ user: user ? { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone } : null });
  } catch (e) {
    return handleError(e);
  }
}
