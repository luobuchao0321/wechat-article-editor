import { NextResponse } from 'next/server';
import dns from 'node:dns';
import { Agent } from 'undici';
import { assertSafeRemoteUrl } from '@/lib/server/remoteUrl';

const ipv4OnlyDispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { ...options, family: 4 }, callback);
    },
  },
});

type CacheEntry = { body: string; contentType: string; cachedAt: number };
const memoryCache = new Map<string, CacheEntry>();
const cacheTtlMs = 1000 * 60 * 60 * 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    await assertSafeRemoteUrl(url);
    const cached = memoryCache.get(url);
    if (cached && Date.now() - cached.cachedAt < cacheTtlMs) {
      return new NextResponse(cached.body, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Proxy-Cache': 'hit',
        },
      });
    }
    const startedAt = Date.now();
    const origin = new URL(request.url).origin;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const signal = (AbortSignal as any).any
      ? (AbortSignal as any).any([controller.signal, request.signal])
      : controller.signal;
    request.signal.addEventListener('abort', () => controller.abort(), { once: true });

    const response = await (fetch as any)(url, {
      signal,
      redirect: 'follow',
      dispatcher: ipv4OnlyDispatcher,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/css,*/*;q=0.1',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: 'https://mp.weixin.qq.com/',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch css: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || 'text/css; charset=utf-8';
    const cssRaw = await response.text();
    const baseUrl = (() => {
      try {
        return new URL(url).toString();
      } catch {
        return url;
      }
    })();

    const rewriteCssUrls = (cssText: string) => {
      return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_m, _q, raw) => {
        const u = (raw || '').trim();
        if (!u) return `url('')`;
        if (u.startsWith('data:')) return `url('${u.replace(/'/g, '%27')}')`;
        if (u.includes('/api/proxy-image')) return `url('${u.replace(/'/g, '%27')}')`;
        let abs = u;
        try {
          abs = new URL(u, baseUrl).toString();
        } catch {}
        const proxied = `${origin}/api/proxy-image?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(baseUrl)}`;
        return `url('${proxied}')`;
      });
    };

    const css = rewriteCssUrls(cssRaw);
    memoryCache.set(url, { body: css, contentType, cachedAt: Date.now() });
    return new NextResponse(css, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Proxy-Cache': 'miss',
        'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
