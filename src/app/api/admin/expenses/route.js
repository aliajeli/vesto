import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate, sanitizeText } from '@/lib/api';
import { logAudit, postLedger } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['RENT', 'PAYROLL', 'MARKETING', 'OPERATING', 'IT', 'OTHER'];

const schema = z.object({
  title: z.string().trim().min(2, 'عنوان هزینه باید حداقل ۲ نویسه باشد.').max(120),
  category: z.enum(CATEGORIES, { message: 'دسته‌بندی نامعتبر است.' }),
  amount: z.number().int().positive('مبلغ باید بزرگ‌تر از صفر باشد.').max(1_000_000_000_000),
  date: z.string().min(4, 'تاریخ نامعتبر است.'),
  note: z.string().max(500).optional().default(''),
});

export async function GET(req) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const take = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 100)));
    const items = await prisma.expense.findMany({ orderBy: { date: 'desc' }, take });
    return ok({ items });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req);
    const data = validate(schema, body);

    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) return fail('تاریخ نامعتبر است.', 400);

    const expense = await prisma.expense.create({
      data: {
        title: sanitizeText(data.title, 120),
        category: data.category,
        amount: data.amount,
        date,
        note: sanitizeText(data.note || '', 500),
      },
    });

    // ثبت سند حسابداری دوطرفه
    await postLedger([
      { type: 'EXPENSE', account: `هزینه ${data.category}`, debit: data.amount, credit: 0, refType: 'EXPENSE', refId: expense.id, description: expense.title },
      { type: 'EXPENSE', account: 'وجه نقد / بانک', debit: 0, credit: data.amount, refType: 'EXPENSE', refId: expense.id, description: expense.title },
    ]);

    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name || admin.email, action: 'ثبت هزینه', entity: 'Expense', entityId: expense.id, severity: 'INFO', after: JSON.stringify({ title: expense.title, amount: expense.amount, category: expense.category }), ...meta });

    return ok({ expense });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return fail('شناسه هزینه ارسال نشده است.', 400);

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return fail('هزینه یافت نشد.', 404);

    await prisma.$transaction([
      prisma.ledgerEntry.deleteMany({ where: { refType: 'EXPENSE', refId: id } }),
      prisma.expense.delete({ where: { id } }),
    ]);

    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name || admin.email, action: 'حذف هزینه', entity: 'Expense', entityId: id, severity: 'WARN', before: JSON.stringify({ title: expense.title, amount: expense.amount }), ...meta });

    return ok();
  } catch (e) {
    return handleError(e);
  }
}
