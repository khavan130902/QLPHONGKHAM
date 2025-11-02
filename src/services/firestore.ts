import firestore from '@react-native-firebase/firestore';

// Wrapper nhỏ cho Firestore
export const db = firestore();

export async function getTodayAppointments() {
  const d = new Date();
  const start = new Date(d.setHours(0, 0, 0, 0)).toISOString();
  const end = new Date(d.setHours(23, 59, 59, 999)).toISOString();
  const snap = await db
    .collection('appointments')
    .where('start', '>=', start)
    .where('start', '<=', end)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export default db;
