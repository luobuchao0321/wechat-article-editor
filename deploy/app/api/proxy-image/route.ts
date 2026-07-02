import { NextResponse } from 'next/server';
import dns from 'node:dns';
import { Agent } from 'undici';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';

const ipv4OnlyDispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      if (hostname === 'mmbiz.qpic.cn' || hostname === 'qpic.cn') {
        dns.lookup(hostname, { ...options, family: 4, all: true }, (err, addresses) => {
          if (!err && Array.isArray(addresses) && addresses.length > 0) {
            const selected = addresses[Math.floor(Math.random() * addresses.length)];
            return callback(null, [{ address: selected.address, family: 4 }]);
          }
          const fallbackIps = ['117.147.187.157', '101.227.173.23', '113.96.233.100'];
          const selectedIp = fallbackIps[Math.floor(Math.random() * fallbackIps.length)];
          return callback(null, [{ address: selectedIp, family: 4 }]);
        });
        return;
      }
      dns.lookup(hostname, { ...options, family: 4 }, callback);
    },
  },
});

const ipv6OnlyDispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { ...options, family: 6 }, callback);
    },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cacheRoot = path.join(
  process.env.WECHAT_IMAGE_CACHE_DIR || path.join(process.cwd(), '.cache'),
  'wechat-proxy',
  'images'
);
const cacheKeyForUrl = (rawUrl: string) =>
  crypto.createHash('sha256').update(rawUrl).digest('hex');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = (searchParams.get('url') || '').replace(/&amp;/g, '&');
  const ref = searchParams.get('ref') || searchParams.get('referer');
  const fallback = searchParams.get('fallback') || '';

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const normalizedUrl = url.split('#')[0];
    const cacheKey = cacheKeyForUrl(normalizedUrl);
    const metaPath = path.join(cacheRoot, `${cacheKey}.json`);
    const bodyPath = path.join(cacheRoot, `${cacheKey}.bin`);

    const readCache = async () => {
      try {
        const [metaRaw, body] = await Promise.all([fs.readFile(metaPath, 'utf-8'), fs.readFile(bodyPath)]);
        const meta = JSON.parse(metaRaw) as { contentType?: string; fetchedAt?: number };
        return { contentType: meta?.contentType || 'application/octet-stream', body };
      } catch {
        return null;
      }
    };

    const cached = await readCache();
    if (cached) {
      return new NextResponse(cached.body, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Proxy-Cache': 'hit',
          'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
        },
      });
    }

    const refererHeader =
      (ref && (ref.startsWith('http://') || ref.startsWith('https://')) ? ref : null) ||
      'https://mp.weixin.qq.com/';

    const uaChrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const uaWeChatIOS =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x1800312c) NetType/WIFI Language/zh_CN';

    const baseHeaders = {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    } as Record<string, string>;

    const fetchWithRedirects = async (inputUrl: string, headers: Record<string, string>, dispatcher?: any) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      try {
        let current = inputUrl;
        let redirects = 0;
        for (;;) {
          const res = await (fetch as any)(current, {
            signal: controller.signal,
            redirect: 'manual',
            dispatcher,
            headers,
          });
          if ([301, 302, 303, 307, 308].includes(res.status)) {
            const loc = res.headers.get('location') || '';
            if (!loc) return { response: res as Response, redirects, finalUrl: current };
            redirects += 1;
            if (redirects > 10) {
              throw new Error('too many redirects');
            }
            current = new URL(loc, current).toString();
            continue;
          }
          return { response: res as Response, redirects, finalUrl: current };
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let response: Response | null = null;
    let lastError: any = null;
    let attemptName = '';
    let redirectCount = 0;
    let finalUpstreamUrl = normalizedUrl;

    const attempts: { name: string; dispatcher?: any; delayMs?: number }[] = [
      { name: 'ipv4', dispatcher: ipv4OnlyDispatcher },
      { name: 'default', dispatcher: undefined, delayMs: 200 },
      { name: 'ipv6', dispatcher: ipv6OnlyDispatcher, delayMs: 600 },
    ];

    for (const a of attempts) {
      if (a.delayMs) await sleep(a.delayMs);
      try {
        // Attempt 1: Standard Referer + Chrome UA
        const primaryHeaders = {
          ...baseHeaders,
          Referer: refererHeader,
          'User-Agent': uaChrome,
        };
        const primary = await fetchWithRedirects(normalizedUrl, primaryHeaders, a.dispatcher);
        
        let currentResponse = primary.response;
        let currentContentType = currentResponse.headers.get('content-type') || '';

        // WECHAT FIX: WeChat sometimes returns 'text/plain' or 'application/octet-stream' for valid images.
        // If it's from mmbiz.qpic.cn, we relax the check.
        const isWeChatDomain = normalizedUrl.includes('mmbiz.qpic.cn') || normalizedUrl.includes('qpic.cn');
        
        let currentLooksBad = 
          !currentResponse.ok || 
          (!isWeChatDomain && (currentContentType.includes('application/json') || currentContentType.includes('text/html')));

        if (!currentLooksBad) {
            attemptName = `${a.name}:chrome`;
            response = currentResponse;
            redirectCount = primary.redirects;
            finalUpstreamUrl = primary.finalUrl;
            lastError = null;
            break;
        }

        // Attempt 2: WeChat Referer + WeChat UA
        const fallbackHeaders = {
          ...baseHeaders,
          Referer: 'https://mp.weixin.qq.com/',
          'User-Agent': uaWeChatIOS,
        };
        const fallback = await fetchWithRedirects(normalizedUrl, fallbackHeaders, a.dispatcher);
        
        currentResponse = fallback.response;
        currentContentType = currentResponse.headers.get('content-type') || '';
        currentLooksBad = 
          !currentResponse.ok || 
          (!isWeChatDomain && (currentContentType.includes('application/json') || currentContentType.includes('text/html')));

        if (!currentLooksBad) {
            attemptName = `${a.name}:wechat`;
            response = currentResponse;
            redirectCount = fallback.redirects;
            finalUpstreamUrl = fallback.finalUrl;
            lastError = null;
            break;
        }

        // Attempt 3: No Referer + Chrome UA (For strict no-hotlinking images)
        const noRefHeaders: Record<string, string> = {
            ...baseHeaders,
            'User-Agent': uaChrome,
        };
        // Explicitly delete Referer just in case
        delete noRefHeaders['Referer'];
        
        const noRef = await fetchWithRedirects(normalizedUrl, noRefHeaders, a.dispatcher);
        
        currentResponse = noRef.response;
        currentContentType = currentResponse.headers.get('content-type') || '';
        currentLooksBad = 
          !currentResponse.ok || 
          (!isWeChatDomain && (currentContentType.includes('application/json') || currentContentType.includes('text/html')));

        if (!currentLooksBad) {
            attemptName = `${a.name}:noref`;
            response = currentResponse;
            redirectCount = noRef.redirects;
            finalUpstreamUrl = noRef.finalUrl;
            lastError = null;
            break;
        }

      } catch (e: any) {
        lastError = e;
        console.error(
          `[Proxy Image] Fetch error (${a.name}) url=${url} message=${e?.message || e} code=${e?.code || ''} cause=${e?.cause?.code || e?.cause || ''}`
        );
      }
    }

    const svgFallback = (reason: string) => {
      const safeUrl = normalizedUrl.slice(0, 180);
      const safeReason = String(reason || '').slice(0, 180);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">` +
        `<rect width="1200" height="700" fill="#f6f7f9"/>` +
        `<rect x="60" y="60" width="1080" height="580" fill="#ffffff" stroke="#d0d7de" stroke-width="2"/>` +
        `<text x="100" y="160" font-size="44" font-family="Arial, sans-serif" fill="#24292f">图片加载失败</text>` +
        `<text x="100" y="230" font-size="26" font-family="Arial, sans-serif" fill="#57606a">原因：${safeReason}</text>` +
        `<text x="100" y="310" font-size="22" font-family="Arial, sans-serif" fill="#6e7781">URL：${safeUrl}</text>` +
        `<text x="100" y="390" font-size="22" font-family="Arial, sans-serif" fill="#6e7781">建议：切换网络/手机热点/VPN 后重试</text>` +
        `</svg>`;
      const res = new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Proxy-Fallback': 'svg',
          'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
        },
      });
      res.headers.set('X-Proxy-Referer', refererHeader);
      res.headers.set('X-Proxy-Attempt', attemptName || 'none');
      res.headers.set('X-Proxy-Redirects', `${redirectCount}`);
      res.headers.set('X-Proxy-Upstream-Url', finalUpstreamUrl);
      return res;
    };

    if (!response) {
      const stale = await readCache();
      if (stale) {
        return new NextResponse(stale.body, {
          headers: {
            'Content-Type': stale.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Proxy-Cache': 'stale',
            'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
          },
        });
      }
      if (fallback === 'svg') {
        return svgFallback(lastError?.cause?.code || lastError?.message || 'fetch failed');
      }
      const errRes = NextResponse.json(
        { error: lastError?.message || 'fetch failed' },
        { status: 502 }
      );
      errRes.headers.set('X-Proxy-Referer', refererHeader);
      errRes.headers.set('X-Proxy-Attempt', attemptName || 'none');
      errRes.headers.set('X-Proxy-Redirects', `${redirectCount}`);
      errRes.headers.set('X-Proxy-Upstream-Url', finalUpstreamUrl);
      errRes.headers.set('X-Proxy-Time-Ms', `${Date.now() - startedAt}`);
      errRes.headers.set('Cache-Control', 'no-store');
      return errRes;
    }

    if (!response.ok) {
      console.error(`[Proxy Image] Failed: ${response.status} ${response.statusText} url=${url}`);
      const stale = await readCache();
      if (stale) {
        return new NextResponse(stale.body, {
          headers: {
            'Content-Type': stale.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Proxy-Cache': 'stale',
            'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
          },
        });
      }
      if (fallback === 'svg') {
        return svgFallback(`upstream ${response.status}`);
      }
      const errRes = NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
      errRes.headers.set('X-Proxy-Status', `${response.status}`);
      errRes.headers.set('X-Proxy-Referer', refererHeader);
      errRes.headers.set('X-Proxy-Attempt', attemptName || 'none');
      errRes.headers.set('X-Proxy-Redirects', `${redirectCount}`);
      errRes.headers.set('X-Proxy-Upstream-Url', finalUpstreamUrl);
      errRes.headers.set('X-Proxy-Time-Ms', `${Date.now() - startedAt}`);
      errRes.headers.set('Cache-Control', 'no-store');
      return errRes;
    }

    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // WECHAT FIX: Force image content-type if upstream is WeChat domain
    // WeChat often returns image/jpeg as text/plain or application/octet-stream
    if (url.includes('mmbiz.qpic.cn') || url.includes('qpic.cn')) {
        if (!contentType.startsWith('image/')) {
             // Try to guess from url fmt
             if (url.includes('/mmbiz_gif/')) contentType = 'image/gif';
             else if (url.includes('/mmbiz_png/')) contentType = 'image/png';
             else if (url.includes('/mmbiz_jpg/') || url.includes('/mmbiz_jpeg/')) contentType = 'image/jpeg';
             else if (url.includes('/mmbiz_webp/')) contentType = 'image/webp';
             else if (url.includes('wx_fmt=png')) contentType = 'image/png';
             else if (url.includes('wx_fmt=gif')) contentType = 'image/gif';
             else if (url.includes('wx_fmt=webp')) contentType = 'image/webp';
             else contentType = 'image/jpeg';
        }
    }
    
    if (contentType.includes('application/json') || contentType.includes('text/html')) {
      const text = await response.text();
      console.error(`[Proxy Image] Non-image upstream: ${contentType} url=${url}`);
      const stale = await readCache();
      if (stale) {
        return new NextResponse(stale.body, {
          headers: {
            'Content-Type': stale.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Proxy-Cache': 'stale',
            'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
          },
        });
      }
      if (fallback === 'svg') {
        return svgFallback(`non-image ${contentType}`);
      }
      const errRes = NextResponse.json(
        { error: 'Upstream did not return an image', contentType },
        { status: 502 }
      );
      errRes.headers.set('X-Proxy-Content-Type', contentType);
      errRes.headers.set('X-Proxy-Referer', refererHeader);
      errRes.headers.set('X-Proxy-Body-Snippet', text.slice(0, 200));
      errRes.headers.set('X-Proxy-Attempt', attemptName || 'none');
      errRes.headers.set('X-Proxy-Redirects', `${redirectCount}`);
      errRes.headers.set('X-Proxy-Upstream-Url', finalUpstreamUrl);
      errRes.headers.set('X-Proxy-Time-Ms', `${Date.now() - startedAt}`);
      errRes.headers.set('Cache-Control', 'no-store');
      return errRes;
    }
    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    try {
      await fs.mkdir(cacheRoot, { recursive: true });
      await Promise.all([
        fs.writeFile(bodyPath, body),
        fs.writeFile(
          metaPath,
          JSON.stringify({ contentType, fetchedAt: Date.now(), url: normalizedUrl }),
          'utf-8'
        ),
      ]);
    } catch {}

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Proxy-Cache': 'miss',
        'X-Proxy-Attempt': attemptName || 'none',
        'X-Proxy-Redirects': `${redirectCount}`,
        'X-Proxy-Upstream-Url': finalUpstreamUrl,
        'X-Proxy-Time-Ms': `${Date.now() - startedAt}`,
      },
    });
  } catch (error: any) {
    console.error(
      `[Proxy Image] Unexpected error url=${url} message=${error?.message || error} code=${error?.code || ''} cause=${error?.cause?.code || error?.cause || ''}`
    );
    const errRes = NextResponse.json({ error: error?.message || 'unknown error' }, { status: 500 });
    errRes.headers.set('X-Proxy-Time-Ms', `${Date.now() - startedAt}`);
    errRes.headers.set('Cache-Control', 'no-store');
    return errRes;
  }
}
