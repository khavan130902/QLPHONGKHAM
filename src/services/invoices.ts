// services/invoices.ts
import db from '@/services/firestore';

type InvoiceLine = { name?: string; amount?: number | string; note?: string };
type InvoiceDoc = {
  title?: string;
  status?: string;
  total?: number | string | null; // muốn đồng nhất là number
  amount?: number | string | null; // hỗ trợ backward-compat
  createdAt?: any;
  patientId?: string;
  appointmentId?: string;
  receiptUrl?: string;
  items?: InvoiceLine[];
  doctorId?: string;
};

function parseMoney(n?: number | string | null): number {
  if (typeof n === 'number') return isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const v = Number(n.replace(/[^\d.-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  return 0;
}

async function computeFallbackTotal(inv: InvoiceDoc): Promise<number> {
  // Ưu tiên total/amount nếu có
  const t = parseMoney(inv.total);
  const a = parseMoney(inv.amount);
  if (t) return t;
  if (a) return a;

  // Items
  if (Array.isArray(inv.items) && inv.items.length) {
    return inv.items.reduce((s, it) => s + parseMoney(it?.amount), 0);
  }

  // Lấy từ appointment nếu có
  if (inv.appointmentId) {
    try {
      const appt = await db
        .collection('appointments')
        .doc(inv.appointmentId)
        .get();
      const ad = appt.data() || {};
      const meta = (ad as any).meta || {};
      const price = parseMoney(meta?.servicePrice ?? (ad as any).price);
      if (price > 0) return price;
    } catch {}
  }
  return 0;
}

async function decorateInvoice(docSnap: any): Promise<any> {
  const base = { id: docSnap.id, ...(docSnap.data() as InvoiceDoc) };

  // title từ appointment nếu thiếu
  if (!base.title && base.appointmentId) {
    try {
      const appt = await db
        .collection('appointments')
        .doc(base.appointmentId)
        .get();
      const meta = (appt.data() as any)?.meta || {};
      const svc = meta?.serviceName || meta?.service_type_name;
      if (svc) (base as any).title = `Hóa đơn dịch vụ: ${svc}`;
    } catch {}
  }

  // chuẩn hoá total là number
  let total = parseMoney(base.total);
  if (!total) {
    total = await computeFallbackTotal(base);
  }
  (base as any).total = total;

  return base;
}

export async function getInvoicesForPatient(patientId: string) {
  const snap = await db
    .collection('invoices')
    .where('patientId', '==', patientId)
    .get();

  const list = await Promise.all(snap.docs.map(decorateInvoice));
  return list.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

export async function getInvoiceById(id: string) {
  const doc = await db.collection('invoices').doc(id).get();
  if (!doc.exists) return null;
  return decorateInvoice(doc);
}
