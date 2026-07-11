import dns from 'node:dns/promises';
import net from 'node:net';

const trustedWechatHosts = new Set(['mp.weixin.qq.com', 'mmbiz.qpic.cn', 'qpic.cn']);

const isPrivateIpv4 = (address: string) => {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a >= 224
  );
};

const isPrivateIp = (address: string) => {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized.startsWith('::ffff:127.');
  }
  return true;
};

const isTrustedWechatHost = (hostname: string) =>
  trustedWechatHosts.has(hostname) || hostname.endsWith('.qpic.cn');

export const assertSafeRemoteUrl = async (rawUrl: string, options: { allowLocal?: boolean } = {}) => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('链接格式无效。');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('仅支持 http 或 https 链接。');
  }

  const hostname = url.hostname.toLowerCase();
  if (options.allowLocal && ['localhost', '127.0.0.1', '::1'].includes(hostname)) return url;
  if (['localhost', '0.0.0.0', '::1'].includes(hostname) || hostname.endsWith('.local')) {
    throw new Error('不允许访问本机或局域网地址。');
  }

  if (isTrustedWechatHost(hostname)) return url;

  const literalIp = net.isIP(hostname);
  if (literalIp) {
    if (isPrivateIp(hostname)) throw new Error('不允许访问内网地址。');
    return url;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('不允许访问内网地址。');
  }
  return url;
};

export const assertWechatArticleUrl = async (rawUrl: string) => {
  const url = await assertSafeRemoteUrl(rawUrl);
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'mp.weixin.qq.com') {
    throw new Error('仅支持 https://mp.weixin.qq.com/ 的公开文章链接。');
  }
  return url;
};
