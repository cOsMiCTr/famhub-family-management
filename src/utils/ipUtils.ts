/**
 * Utility functions for IP address handling
 */

export function getClientIP(req: any): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one (original client)
    const ips = xForwardedFor.split(',').map((ip: string) => ip.trim());
    return ips[0];
  }
  
  // Fallback to other headers
  const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP) {
    return xRealIP;
  }
  
  // Last resort
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

export function cleanIPAddress(ip: string): string {
  // Remove IPv4-mapped IPv6 prefix
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}
