/**
 * Upload a local file (uri) to Firebase Storage and return a download URL.
 * Uses runtime require to avoid TypeScript compile error when the optional
 * `@react-native-firebase/storage` package is not installed.
 */
export async function uploadImage(
  uri: string,
  destPath?: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!uri) throw new Error('No file uri provided');
  const path =
    destPath ??
    `staff/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  // require at runtime so TypeScript won't fail the build if the package is missing.
  // If the package is not installed, throw a clear error so the caller can handle it.
  let storage: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    storage = require('@react-native-firebase/storage');
    if (storage && storage.default) storage = storage.default;
  } catch (e) {
    throw new Error(
      "@react-native-firebase/storage is not installed. Install it with 'npm install @react-native-firebase/storage' and re-run pod install on iOS.",
    );
  }

  const ref = storage().ref(path);
  const task = ref.putFile(uri);

  if (onProgress && typeof task.on === 'function') {
    return new Promise<string>((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot: any) => {
          try {
            const percent =
              snapshot.totalBytes > 0
                ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                : 0;
            onProgress(Math.round(percent));
          } catch (e) {
            // ignore
          }
        },
        (err: any) => reject(err),
        async () => {
          try {
            const url = await ref.getDownloadURL();
            resolve(url);
          } catch (e) {
            reject(e);
          }
        },
      );
    });
  }

  // fallback: wait for task then get URL
  await task;
  const url = await ref.getDownloadURL();
  return url;
}
