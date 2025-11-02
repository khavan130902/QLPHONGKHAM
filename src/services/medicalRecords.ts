import db from './firestore';

export async function getRecordsForPatient(patientId: string) {
  const snap = await db
    .collection('medicalRecords')
    .where('patientId', '==', patientId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function getRecordById(id: string) {
  const doc = await db.collection('medicalRecords').doc(id).get();
  const data =
    doc.data && typeof doc.data === 'function' ? doc.data() : doc.data();
  return data ? { id: doc.id, ...data } : null;
}

export async function getRecordByAppointment(appointmentId: string) {
  const snap = await db
    .collection('medicalRecords')
    .where('appointmentId', '==', appointmentId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) };
}
