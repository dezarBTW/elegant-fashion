export function passportPath(value, baseUrl) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/student-passports\/([0-9a-f-]{36}\/passport\.(?:jpg|png))$/i);
    return url.origin === new URL(baseUrl).origin && match ? match[1] : null;
  } catch { return null; }
}
