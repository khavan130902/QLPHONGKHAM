# Example Firestore Rules (development/test only)

// Allow reads/writes in test mode. DO NOT use in production.
service cloud.firestore {
match /databases/{database}/documents {
match /{document=\*\*} {
allow read, write: if true;
}
}
}

# Suggested production snippets

// Users can read their own profile, admins can read all
// Appointments: patients can create appointments, doctors can update status

// See README for adapting to your app's auth model.
