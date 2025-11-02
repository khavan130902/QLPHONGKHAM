import firestore from '@react-native-firebase/firestore';
import { db } from './firestore';
import timeSlotsService from './timeSlots';

// Helper: normalize a stored date value (string or Firestore Timestamp) to ISO string
const toIso = (v: any) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v.toDate && typeof v.toDate === 'function')
    return v.toDate().toISOString();
  try {
    return new Date(v).toISOString();
  } catch (e) {
    return null;
  }
};

// Strategy: query by doctorId only (single equality). Then perform all
// overlap/date checks client-side after normalizing stored start/end values.
// This avoids composite-index requirements and also avoids Timestamp/string
// comparison problems because we convert values to ISO strings before
// comparing.

export async function isSlotAvailable(
  doctorId: string,
  startISO: string,
  endISO: string,
) {
  const snap = await db
    .collection('appointments')
    .where('doctorId', '==', doctorId)
    .get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  // lightweight debug info
  console.warn(
    '[isSlotAvailable] scanned',
    docs.length,
    'appointments for doctor',
    doctorId,
  );
  const overlap = docs.some((it: any) => {
    const s = toIso(it.start);
    const e = toIso(it.end);
    if (!s || !e) return false;
    // overlap exists if stored.start < requested.end && stored.end > requested.start
    return s < endISO && e > startISO;
  });
  return !overlap;
}

export async function createBooking(appointment: {
  doctorId: string;
  patientId: string;
  start: string;
  end: string;
  [key: string]: any;
}) {
  const { doctorId, start, end } = appointment as any;
  // Query by doctorId only and check overlap in JS to avoid index + type issues
  const snap = await db
    .collection('appointments')
    .where('doctorId', '==', doctorId)
    .get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  console.warn(
    '[createBooking] scanned',
    docs.length,
    'appointments for doctor',
    doctorId,
  );
  const overlap = docs.some((it: any) => {
    const s = toIso(it.start);
    const e = toIso(it.end);
    if (!s || !e) return false;
    return s < end && e > start;
  });
  if (overlap) throw new Error('Slot not available');

  const ref = await db.collection('appointments').add({
    ...appointment,
    createdAt: firestore.FieldValue.serverTimestamp(),
    status: 'pending',
  } as any);
  return ref.id;
}

// Try to create booking using a precomputed time_slot (atomic transaction).
export async function createBookingWithSlot(
  slotId: string,
  appointment: { patientId: string; [key: string]: any },
) {
  // delegate to timeSlots service which runs a transaction
  return timeSlotsService.bookSlotAtomically(slotId, appointment as any);
}

export async function getAppointmentsForDoctorOnDay(
  doctorId: string,
  date: Date,
) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  const snap = await db
    .collection('appointments')
    .where('doctorId', '==', doctorId)
    .get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter((r: any) => {
      const s = toIso(r.start);
      if (!s) return false;
      return s >= dayStart.toISOString() && s <= dayEnd.toISOString();
    });
}

export async function isSlotAvailableForReschedule(
  doctorId: string,
  startISO: string,
  endISO: string,
  appointmentIdToExclude?: string,
) {
  const snap = await db
    .collection('appointments')
    .where('doctorId', '==', doctorId)
    .get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const filtered = items.filter((it: any) => {
    if (appointmentIdToExclude && it.id === appointmentIdToExclude)
      return false;
    const s = toIso(it.start);
    const e = toIso(it.end);
    if (!s || !e) return false;
    return s < endISO && e > startISO;
  });
  return filtered.length === 0;
}
