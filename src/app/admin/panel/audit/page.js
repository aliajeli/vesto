import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, StatCard, DataTable } from '@/components/admin/AdminUI';
import { ChartCard, DonutChart, BarsChart } from '@/components/admin/Charts';
import AuditFilters from '@/components/admin/AuditFilters';
import ExportButton from '@/components/admin/ExportButton';
import { formatPrice, toFaDigits, groupDigits } from '@/lib/money';
import { Icons } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'حسابرسی و امنیت' };

const PAGE_SIZE = 40;

const SEV = {
  CRITICAL: { label: 'بحرانی', color: 'var(--danger)' },
  WARN: { label: 'هشدار', color: 'var(--warning)' },
  INFO: { label: 'عادی', color: 'var(--text-muted)' },
};

function faDT(d) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(d));
  } catch { return '—'; }
}

export default async function AuditPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const severity = sp?.severity || '';
  const action = sp?.action || '';
  const q = (sp?.q || '').trim();
  const page = Math.max(1, Number(sp?.page || 1));

  const where = {
    ...(severity ? { severity } : {}),
    ...(action ? { action } : {}),
    ...(q ? { OR: [{ actorName: { contains: q } }, { ip: { contains: q } }, { entityId: { contains: q } }, { action: { contains: q } }] } : {}),
  };

  const dayAgo = new Date(Date.now() - 86400000);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [logs, total, sevCounts, actionCounts, criticalRecent, failedLogins, lockedUsers, sessions, ledgerCheck, orphanPayments] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['severity'], _count: true }),
    prisma.auditLog.groupBy({ by: ['action'], _count: true, orderBy: { _count: { action: 'desc' } }, take: 10 }),
    prisma.auditLog.count({ where: { severity: 'CRITICAL', createdAt: { gte: weekAgo } } }),
    prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.session.count({ where: { expiresAt: { gt: new Date() }, revokedAt: null } }),
    prisma.ledgerEntry.aggregate({ _sum: { debit: true, credit: true } }),
    prisma.payment.count({ where: { status: 'SUCCESS', order: { status: { in: ['PENDING', 'CANCELLED'] } } } }),
  ]);

  const smap = Object.fromEntries(sevCounts.map((s) => [s.severity, s._count]));
  const debit = ledgerCheck._sum.debit || 0;
  const credit = ledgerCheck._sum.credit || 0;
  const balanced = Math.abs(debit - credit) < 10;

  const rows = logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    action: l.action,
    actionFa: l.action,
    actor: l.actorName || 'سیستم',
    entity: l.entity || '',
    entityId: l.entityId || '',
    ip: l.ip || '',
    userAgent: l.userAgent || '',
    severity: l.severity,
    before: l.before,
    after: l.after,
  }));

  // بررسی‌های سلامت سیستم
  const checks = [
    { ok: balanced, title: 'تراز دفتر کل', detail: balanced ? 'مجموع بدهکار و بستانکار برابر است.' : `اختلاف ${formatPrice(Math.abs(debit - credit))}` },
    { ok: orphanPayments === 0, title: 'انطباق پرداخت و سفارش', detail: orphanPayments === 0 ? 'هیچ پرداخت موفقی روی سفارش لغوشده وجود ندارد.' : `${toFaDigits(orphanPayments)} مورد مشکوک` },
    { ok: lockedUsers === 0, title: 'حساب‌های قفل‌شده', detail: lockedUsers === 0 ? 'هیچ حسابی به‌دلیل تلاش ناموفق قفل نیست.' : `${toFaDigits(lockedUsers)} حساب قفل است` },
    { ok: criticalRecent === 0, title: 'رویدادهای بحرانی هفته', detail: criticalRecent === 0 ? 'رویداد بحرانی ثبت نشده است.' : `${toFaDigits(criticalRecent)} رویداد نیازمند بررسی` },
  ];

  return (
    <>
      <PageHeader title="حسابرسی و امنیت" subtitle="ردیابی کامل رویدادها، بررسی سلامت مالی و پایش تلاش‌های نفوذ" icon="shield">
        <ExportButton type="ledger" range="all" label="خروجی دفتر کل" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="کل رویدادهای ثبت‌شده" value={toFaDigits(groupDigits(Object.values(smap).reduce((s, n) => s + n, 0)))} icon="book" />
        <StatCard label="رویداد بحرانی (۷ روز)" value={toFaDigits(criticalRecent)} icon="alert" tone={criticalRecent ? 'danger' : 'success'} />
        <StatCard label="ورود ناموفق (۲۴ ساعت)" value={toFaDigits(failedLogins)} icon="shield" tone={failedLogins > 10 ? 'warning' : 'primary'} />
        <StatCard label="نشست‌های فعال" value={toFaDigits(groupDigits(sessions))} icon="users" tone="accent" />
      </div>

      {/* بررسی سلامت */}
      <div className="card p-4 md:p-5 mb-4">
        <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
          <Icons.shield size={16} style={{ color: 'var(--primary)' }} /> بررسی خودکار سلامت سیستم
        </h3>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {checks.map((c, i) => (
            <div
              key={i}
              className="rounded-theme p-3.5 border"
              style={{
                borderColor: c.ok ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'color-mix(in srgb, var(--danger) 35%, transparent)',
                background: c.ok ? 'color-mix(in srgb, var(--success) 6%, transparent)' : 'color-mix(in srgb, var(--danger) 8%, transparent)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color: c.ok ? 'var(--success)' : 'var(--danger)' }}>
                  {c.ok ? <Icons.check size={15} /> : <Icons.alert size={15} />}
                </span>
                <p className="text-xs font-extrabold">{c.title}</p>
              </div>
              <p className="text-[10px] text-muted leading-5">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title="سطح‌بندی رویدادها" subtitle="کل تاریخچه" height={240}>
          <DonutChart
            data={Object.entries(smap).map(([k, v]) => ({ name: SEV[k]?.label || k, value: v }))}
            money={false}
          />
        </ChartCard>
        <ChartCard title="پرتکرارترین عملیات" subtitle="۱۰ رویداد برتر" height={240} className="lg:col-span-2">
          <BarsChart
            data={actionCounts.map((a) => ({ label: a.action, count: a._count }))}
            keys={['count']} names={{ count: 'دفعات' }} money={false} horizontal
          />
        </ChartCard>
      </div>

      <div className="card p-4 md:p-5">
        <AuditFilters severity={severity} action={action} q={q} actions={actionCounts.map((a) => ({ id: a.action, label: a.action }))} />

        <DataTable
          dense
          columns={[
            { key: 'createdAt', title: 'زمان', render: (r) => <span className="text-[10px] text-muted whitespace-nowrap tabular">{faDT(r.createdAt)}</span> },
            {
              key: 'severity', title: 'سطح', align: 'center',
              render: (r) => {
                const s = SEV[r.severity] || SEV.INFO;
                return <span className="badge text-[9px]" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>{s.label}</span>;
              },
            },
            { key: 'action', title: 'عملیات', render: (r) => <span className="text-[11px] font-bold">{r.actionFa}</span> },
            { key: 'actor', title: 'کاربر', render: (r) => <span className="text-[11px] truncate block max-w-[130px]">{r.actor}</span> },
            {
              key: 'entity', title: 'موضوع',
              render: (r) => (
                <span className="text-[10px] text-muted tabular truncate block max-w-[140px]" dir="ltr" title={r.entityId}>
                  {r.entity}{r.entityId ? `:${r.entityId.slice(0, 12)}` : ''}
                </span>
              ),
            },
            { key: 'ip', title: 'IP', render: (r) => <span className="text-[10px] text-muted tabular" dir="ltr">{r.ip}</span> },
            {
              key: 'detail', title: 'جزئیات',
              render: (r) => {
                const txt = r.after || r.before || '';
                return <span className="text-[10px] text-muted truncate block max-w-[240px]" dir="ltr" title={txt}>{txt.slice(0, 90)}</span>;
              },
            },
          ]}
          rows={rows}
          empty="رویدادی با این فیلترها ثبت نشده است."
        />

        {total > PAGE_SIZE && (
          <p className="text-center text-[11px] text-muted mt-4 tabular">
            نمایش {toFaDigits((page - 1) * PAGE_SIZE + 1)} تا {toFaDigits(Math.min(page * PAGE_SIZE, total))} از {toFaDigits(groupDigits(total))} رویداد
          </p>
        )}
      </div>
    </>
  );
}
