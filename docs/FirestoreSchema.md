# Firestore Schema (suggested)

collections:

- users (user profiles)

  - id: auth uid
  - name: string
  - phone: string
  - role: 'patient' | 'doctor' | 'admin'
  - specialty?: string
  - createdAt: iso string

- appointments

  - id: auto
  - doctorId: uid
  - patientId: uid
  - start: ISO string
  - end: ISO string
  - status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  - price?: number
  - notes?: string
  - createdAt: serverTimestamp

- specialties (optional)
  - id: slug
  - name: string
  - description: string

Notes:

- Consider adding indexes on appointments: doctorId + start range queries.
- Use transactions when creating appointments to avoid double-booking.
