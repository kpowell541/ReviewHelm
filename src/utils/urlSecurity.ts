export function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
}

export function isSecureWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && isLocalHost(parsed.hostname);
  } catch {
    return false;
  }
}
