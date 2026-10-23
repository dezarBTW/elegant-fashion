export function passportUploadError(error) {
  const status = Number(error?.statusCode || error?.status);
  if (status === 401 || status === 403 || /row.level security|jwt|session/i.test(error?.message || '')) {
    return 'Your photo could not be uploaded. Please sign in again, then choose your passport photo once more.';
  }
  return 'Your photo could not be uploaded. Check your connection and try again with a JPG or PNG image under 5 MB.';
}
