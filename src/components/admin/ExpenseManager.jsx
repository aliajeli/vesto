'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Modal, Confirm, Spinner, money, toFa, faDate } from '@/components/ui';

const CATEGORIES = [
  { id: 'RENT', label: 'اجاره' },
  { id: 'PAYROLL', label: 'حقوق و دستمزد' },
  { id: 'MARKETING', label: 'بازاریابی و تبلیغات' },
  { id: 'OPERATING', label: 'هزینه‌های عملیاتی' },
  { id: 'IT', label: 'نرم‌افزار و زیرساخت' },
  { id: 'OTHER', label: 'سایر' },
];
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

export default function ExpenseManager({ initialExpenses = [] }) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'OPERATING', amountToman: '', date: today(), note: '' });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/api/admin/expenses', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          category: form.category,
          amount: Math.round(Number(form.amountToman || 0) * 10),
          date: form.date,
          note: form.note.trim(),
        },
      });
      push('هزینه ثبت شد.', 'success');
      setOpen(false);
      setForm({ title: '', category: 'OPERATING', amountToman: '', date: today(), note: '' });
      router.refresh();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await apiFetch(`/api/admin/expenses?id=${confirmId}`, { method: 'DELETE' });
      push('هزینه حذف شد.', 'success');
      router.refresh();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-sm font-extrabold flex items-center gap-2">
          <Icons.wallet size={17} style={{ color: 'var(--primary)' }} /> ثبت و مدیریت هزینه‌ها
        </h3>
        <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm">
          <Icons.plus size={14} /> هزینه جدید
        </button>
      </div>

      {initialExpenses.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">هزینه‌ای در این بازه ثبت نشده است.</p>
      ) : (
        <div className="scroll-x -mx-4 md:mx-0 px-4 md:px-0">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-line">
                {['عنوان', 'دسته', 'تاریخ', 'مبلغ', ''].map((h, i) => (
                  <th key={i} className="text-right text-[11px] font-extrabold text-muted pb-2.5 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialExpenses.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="py-2.5 px-2">
                    <p className="text-xs font-bold">{e.title}</p>
                    {e.note && <p className="text-[10px] text-muted mt-0.5">{e.note}</p>}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{catLabel(e.category)}</span>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted">{faDate(e.date)}</td>
                  <td className="py-2.5 px-2 text-xs font-extrabold tabular" style={{ color: 'var(--danger)' }}>{money(e.amount)}</td>
                  <td className="py-2.5 px-2 text-left">
                    <button onClick={() => setConfirmId(e.id)} className="text-muted hover:text-[var(--danger)]" aria-label="حذف">
                      <Icons.trash size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="ثبت هزینه جدید"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">انصراف</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? <Spinner size={15} /> : <Icons.check size={15} />} ثبت هزینه
            </button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-3.5">
          <div>
            <label className="label">عنوان هزینه</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً اجاره انبار مرداد" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">دسته‌بندی</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تاریخ</label>
              <input type="date" className="input" dir="ltr" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">مبلغ (تومان)</label>
            <input type="number" inputMode="numeric" className="input tabular" dir="ltr" value={form.amountToman} onChange={(e) => setForm({ ...form, amountToman: e.target.value })} placeholder="5000000" required min={1} />
          </div>
          <div>
            <label className="label">یادداشت (اختیاری)</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!confirmId}
        title="حذف هزینه"
        message="آیا از حذف این هزینه مطمئن هستید؟ این عملیات قابل بازگشت نیست."
        onCancel={() => setConfirmId(null)}
        onConfirm={remove}
        confirmText="حذف"
      />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
