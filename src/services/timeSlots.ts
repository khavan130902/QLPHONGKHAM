import { db } from './firestore';
import firestore from '@react-native-firebase/firestore';

// time_slots document shape (recommended):
// {
//  id, doctor_id, date: 'YYYY-MM-DD', start: 'HH:mm', end: 'HH:mm', is_booked: boolean, room_id: string|null
// }

export async function getAvailableSlots(doctorId: string, date: string) {
  try {
    const snap = await db
      .collection('time_slots')
      .where('doctor_id', '==', doctorId)
      .where('date', '==', date)
      .where('is_booked', '==', false)
      .orderBy('start', 'asc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (e) {
    console.warn('getAvailableSlots fail', e);
    return [];
  }
}

// Generate slots for a single doctor on a date from work_shifts definitions.
// This is a naive generator; for full behavior use scripts/gen_slots.ts.
export async function generateSlotsForDate(
  doctorId: string,
  date: string,
  slotDurationMin = 30,
) {
  // read work_shifts for doctor (day_of_week)
  try {
    const d = new Date(date + 'T00:00:00');
    const dow = d.getDay();
    const snap = await db
      .collection('work_shifts')
      .where('doctor_id', '==', doctorId)
      .where('day_of_week', '==', dow)
      .get();
    if (snap.empty) return [];
    const created: any[] = [];
    for (const doc of snap.docs) {
      const ws = doc.data() as any;
      const startParts = (ws.start_time || '09:00').split(':').map(Number);
      const endParts = (ws.end_time || '17:00').split(':').map(Number);
      const start = new Date(date + 'T00:00:00');
      start.setHours(startParts[0], startParts[1] || 0, 0, 0);
      const end = new Date(date + 'T00:00:00');
      end.setHours(endParts[0], endParts[1] || 0, 0, 0);
      let cur = new Date(start);
      while (cur < end) {
        const hh = cur.getHours();
        const mm = cur.getMinutes();
        const s =
          (hh < 10 ? '0' + hh : '' + hh) + ':' + (mm < 10 ? '0' + mm : '' + mm);
        const slotEnd = new Date(cur);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMin);
        const eh = slotEnd.getHours();
        const em = slotEnd.getMinutes();
        const e =
          (eh < 10 ? '0' + eh : '' + eh) + ':' + (em < 10 ? '0' + em : '' + em);
        // create doc if not exists (idempotent-ish: check by doctor_id+date+start)
        const exists = await db
          .collection('time_slots')
          .where('doctor_id', '==', doctorId)
          .where('date', '==', date)
          .where('start', '==', s)
          .limit(1)
          .get();
        if (exists.empty) {
          const ref = await db.collection('time_slots').add({
            doctor_id: doctorId,
            date,
            start: s,
            end: e,
            is_booked: false,
            created_at: firestore.FieldValue.serverTimestamp(),
          } as any);
          created.push({
            id: ref.id,
            doctor_id: doctorId,
            date,
            start: s,
            end: e,
          });
        }
        cur = slotEnd;
      }
    }
    return created;
  } catch (e) {
    console.warn('generateSlotsForDate fail', e);
    return [];
  }
}

// Book a slot atomically: mark time_slot.is_booked = true and create appointment in a transaction
export async function bookSlotAtomically(
  slotId: string,
  appointment: Record<string, any>,
) {
  const slotRef = db.collection('time_slots').doc(slotId);
  const apptRef = db.collection('appointments').doc();
  return db.runTransaction(async t => {
    const slotSnap = await t.get(slotRef);
    if (!slotSnap.exists) throw new Error('Slot not found');
    const slot = slotSnap.data() as any;
    if (slot.is_booked) throw new Error('Slot already booked');
    // mark slot booked
    t.update(slotRef, {
      is_booked: true,
      booked_at: firestore.FieldValue.serverTimestamp(),
    } as any);
    // create appointment doc (merge provided appointment fields)
    const payload = {
      ...appointment,
      time_slot_id: slotId,
      doctorId: appointment.doctorId || slot.doctor_id,
      start: appointment.start || `${slot.date}T${slot.start}:00`,
      end: appointment.end || `${slot.date}T${slot.end}:00`,
      createdAt: firestore.FieldValue.serverTimestamp(),
      status: 'pending',
    } as any;
    t.set(apptRef, payload);
    return apptRef.id;
  });
}

export default {
  getAvailableSlots,
  generateSlotsForDate,
  bookSlotAtomically,
};
