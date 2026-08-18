import { getCategoriesTree } from '@/lib/queries';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ categories: await getCategoriesTree() });
  } catch (e) {
    return handleError(e);
  }
}
