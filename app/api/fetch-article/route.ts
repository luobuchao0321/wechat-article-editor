import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import dns from 'node:dns';
import { Agent } from 'undici';
import { assertWechatArticleUrl } from '@/lib/server/remoteUrl';

type ArticleCacheEntry = { body: any; cachedAt: number };
const articleCache = new Map<string, ArticleCacheEntry>();
const articleCacheTtlMs = 1000 * 60 * 10;

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

const makeSemaphore = (max: number) => {
  let active = 0;
  const queue: Array<() => void> = [];
  const acquire = async () => {
    if (active < max) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve) => queue.push(resolve));
    active += 1;
  };
  const release = () => {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  };
  const run = async <T>(fn: () => Promise<T>) => {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
  return { run };
};

const fetchSemaphore = makeSemaphore(2);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url') || '';
  const normalizeArticleUrl = (raw: string) => {
    const s = (raw || '').trim();
    if (!s) return '';
    let t = s;
    if (
      (t.startsWith('`') && t.endsWith('`')) ||
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'"))
    ) {
      t = t.slice(1, -1).trim();
    }
    const m = t.match(/https?:\/\/\S+/i);
    if (m && m[0]) {
      t = m[0].replace(/[)\]，。,;；]+$/g, '');
    }
    return t.trim();
  };
  const url = normalizeArticleUrl(rawUrl);

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    await assertWechatArticleUrl(url);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '文章链接不安全。' }, { status: 400 });
  }

  const cached = articleCache.get(url);
  if (cached && Date.now() - cached.cachedAt < articleCacheTtlMs) {
    const res = NextResponse.json(cached.body);
    res.headers.set('X-Article-Cache', 'hit');
    return res;
  }

  console.log(`[Fetch Article] Starting fetch for: ${url}`);

  try {
    return await fetchSemaphore.run(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const fetchWithTimeout = async (timeoutMs: number, dispatcher?: any) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const signal = (AbortSignal as any).any
          ? (AbortSignal as any).any([controller.signal, request.signal])
          : controller.signal;
        request.signal.addEventListener('abort', () => controller.abort(), { once: true });
        return await (fetch as any)(url, {
          signal,
          redirect: 'follow',
          dispatcher,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Referer: 'https://mp.weixin.qq.com/',
          },
        });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const attempts: { name: string; timeoutMs: number; dispatcher?: any; delayMs?: number }[] = [
      { name: 'ipv4', timeoutMs: 45000, dispatcher: ipv4OnlyDispatcher },
      { name: 'default', timeoutMs: 45000, dispatcher: undefined, delayMs: 200 },
      { name: 'ipv6', timeoutMs: 60000, dispatcher: ipv6OnlyDispatcher, delayMs: 600 },
    ];

    let response: Response | null = null;
    let lastErr: any = null;
    let captchaUrl: string | null = null;
    for (const a of attempts) {
      try {
        if (a.delayMs) await sleep(a.delayMs);
        const r = await fetchWithTimeout(a.timeoutMs, a.dispatcher);
        const finalUrl = (r as any)?.url || '';
        if (finalUrl.includes('wappoc_appmsgcaptcha') || finalUrl.includes('verify')) {
          captchaUrl = finalUrl;
          response = r as Response;
          break;
        }
        if (r && r.ok) {
          response = r as Response;
          break;
        }
        lastErr = new Error(`status ${r?.status} ${r?.statusText || ''}`.trim());
      } catch (e: any) {
        lastErr = e;
      }
    }

    if (!response) {
      const msg = lastErr?.name === 'AbortError' || String(lastErr?.message || '').includes('aborted')
        ? '抓取超时：请稍后重试或更换网络/IP'
        : `获取文章失败: ${lastErr?.message || lastErr || 'unknown error'}`;
      throw new Error(msg);
    }

    if (!response.ok) {
      console.error(`[Fetch Article] Failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`获取文章失败: ${response.status} ${response.statusText}`);
    }

    // Check for captcha redirect
    const finalUrl = response.url;
    if (captchaUrl || finalUrl.includes('wappoc_appmsgcaptcha') || finalUrl.includes('verify')) {
        console.error(`[Fetch Article] Redirected to captcha: ${captchaUrl || finalUrl}`);
        const err: any = new Error('微信反爬验证：出现验证码页面，请稍后再试或更换网络/IP');
        err.statusCode = 429;
        throw err;
    }

    const html = await response.text();
    console.log(`[Fetch Article] Fetched HTML length: ${html.length}`);

    // Check for verification text in HTML even if URL didn't change (sometimes 200 OK with captcha form)
    if (html.includes('id="verify_code"') || html.includes('访问过于频繁')) {
         throw new Error('微信反爬验证：访问过于频繁，请稍后再试');
    }

    const $ = cheerio.load(html, {
      xmlMode: false,
    });

    const cssLinks = $('head link[rel="stylesheet"][href]')
      .map((_, el) => $(el).attr('href') || '')
      .get()
      .map((href) => href.trim())
      .filter(Boolean)
      .map((href) => {
        if (href.startsWith('//')) return `https:${href}`;
        if (href.startsWith('/')) return `https://mp.weixin.qq.com${href}`;
        return href;
      });

    const styles = $('head style')
      .map((_, el) => $(el).html() || '')
      .get()
      .map((s) => s.trim())
      .filter((s) => s && s.includes('{') && !s.includes('.concat(') && !s.includes('function') && s.length < 50000)
      .join('\n');

    // Extract Metadata
    const title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
    let cover = $('meta[property="og:image"]').attr('content') || '';
    if (cover) cover = cover.replace(/&amp;/g, '&');
    
    // Fallback for cover if meta tag is missing (check msg_cdn_url var)
    if (!cover) {
        const scriptContent = $('script').text();
        const match = scriptContent.match(/var\s+msg_cdn_url\s*=\s*"(.*?)";/);
        if (match && match[1]) {
            cover = match[1].replace(/&amp;/g, '&');
        }
    }
    
    const desc = $('meta[property="og:description"]').attr('content') || '';
    
    console.log(`[Fetch Article] Parsed title: ${title}`);

    // Get the main content content
    // WeChat articles usually have content in #js_content
    let $content = $('#js_content');
    
    if ($content.length === 0) {
       console.warn(`[Fetch Article] #js_content not found`);
       // Check if it's because of specific WeChat page structure changes or invalid content
       if (!title) {
           throw new Error('解析失败：未找到文章内容或标题。可能是链接无效或文章已被删除。');
       }
       // If we have title but no js_content, maybe it's a video page or other type?
       // Let's try .rich_media_content
       $content = $('.rich_media_content');
       if ($content.length === 0) {
           $content = $('body'); // Last resort
       }
    }

    // Process Content
    // Extract video data from scripts BEFORE removing them
    const scriptContent = $content.find('script').map((_, el) => $(el).html()).get().join('\n');
    let finderUserName = '';
    let finderExportId = '';
    
    // Try to find finderUserName and exportId from script content (often in window.__finder_post_data or similar)
    const finderUserMatch = scriptContent.match(/finderUserName\s*:\s*['"](.*?)['"]/);
    if (finderUserMatch) finderUserName = finderUserMatch[1];
    
    const finderIdMatch = scriptContent.match(/exportId\s*:\s*['"](.*?)['"]/);
    if (finderIdMatch) finderExportId = finderIdMatch[1];

    $content.find('script').remove();

    $content.find('img[src]').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      if (src && src.includes('&amp;')) {
        $el.attr('src', src.replace(/&amp;/g, '&'));
      }
    });

    // 2. Handle data-src -> src
    $content.find('[data-src]').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('data-src');
      if (src) {
        $el.attr('src', src.replace(/&amp;/g, '&'));
        $el.removeAttr('data-src');
      }
    });

    const toAbsoluteUrl = (u: string) => (u.startsWith('//') ? `https:${u}` : u);
    const shouldProxyImageUrl = (u: string) =>
      u.includes('mmbiz.qpic.cn') || u.includes('qpic.cn');
    const makeProxyUrl = (u: string) =>
      `/api/proxy-image?url=${encodeURIComponent(u.replace(/&amp;/g, '&'))}`;

    $content.find('img').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src') || '';
      if (!src) return;
      if (src.includes('/api/proxy-image?url=')) return;
      const absolute = toAbsoluteUrl(src);
      if (!shouldProxyImageUrl(absolute)) return;
      $el.attr('src', makeProxyUrl(absolute));
    });

    $content.find('[style*="url("], [style*="mmbiz.qpic.cn"], [style*="qpic.cn"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr('style') || '';
      if (!style) return;
      const next = style.replace(/url\(([^)]+)\)/g, (_m, inner) => {
        let raw = String(inner || '').trim();
        raw = raw.replace(/^\\\"|\\\"$/g, '"');
        raw = raw.replace(/^['"]|['"]$/g, '');
        raw = raw.replace(/^&quot;|&quot;$/g, '');
        raw = raw.replace(/^&amp;quot;|&amp;quot;$/g, '');
        raw = raw.replace(/&amp;/g, '&');
        raw = raw.trim();
        if (!raw) return `url(${inner})`;
        if (raw.includes('/api/proxy-image?url=')) return `url("${raw}")`;
        const absolute = toAbsoluteUrl(raw);
        if (!shouldProxyImageUrl(absolute)) return `url("${raw}")`;
        return `url("${makeProxyUrl(absolute)}")`;
      });
      if (next !== style) $el.attr('style', next);
    });

    // 3. Handle visibility: hidden -> visible
    $content.find('[style*="visibility"]').each((_, el) => {
      const $el = $(el);
      let style = $el.attr('style') || '';
      if (style.includes('visibility: hidden') || style.includes('visibility:hidden')) {
        style = style.replace(/visibility\s*:\s*hidden/g, 'visibility: visible');
        $el.attr('style', style);
      }
    });

    // 4. Background images in style
    const backgroundImages: string[] = [];
    $content.find('[style*="background-image"]').each((_, el) => {
       const $el = $(el);
       const style = $el.attr('style') || '';
       const match = style.match(/url\(['"]?(.*?)['"]?\)/);
       if (match && match[1]) {
           backgroundImages.push(match[1]);
       }
    });

    // 5. Clean up
    // Don't remove onclick/onerror from SVG elements as they might have animations or interactions
    $content.find('*').not('svg, svg *').removeAttr('onclick').removeAttr('onerror');

    // 6. Handle Video Channels (wx-channels)
    // Convert to a placeholder image with link, as iframe embedding is restricted
    // Case 1: Existing tags
    $('iframe, .video_iframe, wx-channels').each((_, el) => {
        const $el = $(el);
        const src = $el.attr('data-src') || $el.attr('src') || '';
        const cover = $el.attr('data-cover') || $el.attr('poster') || ''; // Try to get cover
        
        // Create a visual placeholder
        const placeholder = `
            <div style="text-align: center; margin: 20px 0; border: 1px solid #eee; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                ${cover ? `<img src="${cover}" style="max-width: 100%; height: auto; margin-bottom: 10px; border-radius: 4px;" />` : ''}
                <div style="font-size: 14px; color: #666; font-weight: bold;">
                   🎥 视频号/视频内容
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">
                   (CMS 暂不支持直接播放，请在公众号后台重新插入视频)
                </div>
                ${src ? `<a href="${src}" target="_blank" style="display: inline-block; margin-top: 10px; font-size: 12px; color: #576b95; text-decoration: none;">🔗 点击跳转查看原视频</a>` : ''}
            </div>
        `;
        $el.replaceWith(placeholder);
    });

    // Case 2: Script-based finder video (common in new WeChat articles)
    // Look for <script> that inserts the video and the placeholder div
    // The structure is usually a div with class "js_finder_post_container" or similar, 
    // populated by a script checking "window.__finder_post_data" or similar.
    // Since we remove scripts, we need to manually find these placeholders or recover data from raw HTML before script removal?
    // Actually, we already removed scripts in step 1. But we can look at the raw HTML or check for specific marker divs.
    
    // Often WeChat puts a `js_video_url` or `finder_video_url` in script variables. 
    // But in the DOM, it might just be a placeholder div.
    // Let's look for known placeholder classes for Finder videos
    $('.js_finder_post_container, .channels_iframe_box').each((_, el) => {
         const $el = $(el);
         // If it hasn't been replaced by the iframe rule above
         if ($el.find('img').length === 0 && $el.text().trim().length === 0) {
             const videoId = $el.attr('data-export-id') || finderExportId;
             const userName = $el.attr('data-finder-user-name') || finderUserName;
             
             const placeholder = `
                <div style="text-align: center; margin: 20px 0; border: 1px solid #eee; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #666; font-weight: bold;">
                       🎥 视频号内容 (动态加载)
                    </div>
                    ${userName ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">视频号ID: ${userName}</div>` : ''}
                    <div style="font-size: 12px; color: #999; margin-top: 5px;">
                       (此处包含视频号内容，因技术限制无法抓取，请在后台手动插入)
                    </div>
                    ${videoId ? `<div style="font-size: 10px; color: #ccc; margin-top: 5px;">Export ID: ${videoId}</div>` : ''}
                </div>
            `;
            $el.replaceWith(placeholder);
         }
    });

    // 7. Extract inline styles from body/content
    // WeChat sometimes puts <style> tags inside #js_content which cheerio might strip or we need to ensure they stay
    // We already extract head styles, but let's make sure content styles are preserved
    // Actually cheerio keeps them in .html(), so no extra action needed unless we want to move them to head.
    // BUT: We need to make sure we don't double-escape them.
    
    // BORDER FIX: Check for empty sections that might be borders (some editors use empty sections with background)
    // We should NOT remove empty sections if they have styles
    // (We are not currently removing empty tags, so this is just a comment to verify we don't add such logic)
    
    // SVG Animation Fix: Ensure SVGs preserve their internal <style> and <animate> tags
    // Cheerio might have issues with some SVG namespaces or attributes if not in xmlMode, but we used xmlMode: false for HTML compat.
    // Let's manually ensure SVG styles are not stripped or corrupted.
    console.log(`[Fetch Article] SVG debug: found ${$content.find('svg').length} SVG elements before style processing`);
    $content.find('svg').each((i, el) => {
        // console.log(`[Fetch Article] SVG ${i}:`, $(el).prop('outerHTML')?.substring(0, 500) + '...');
        // Ensure SVG namespace attributes are preserved
        const $svg = $(el);
        // Check for missing xmlns attribute (optional but good for compatibility)
        if (!$svg.attr('xmlns')) {
            $svg.attr('xmlns', 'http://www.w3.org/2000/svg');
        }
        // Preserve all child elements, especially animate, defs, etc.
    });
    $content.find('svg style').each((_, el) => {
        // Just ensure it has content, sometimes it gets emptied
        let styleContent = $(el).html();
        console.log(`[Fetch Article] SVG style found, length: ${styleContent?.length}`);
        if (styleContent) {
            // Unescape entities in style content if Cheerio escaped them
            // SVG styles often contain > < & which might be escaped
            // Also handle CDATA sections if present
            if (styleContent.includes('<![CDATA[')) {
                // Extract content between CDATA tags
                const cdataMatch = styleContent.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
                if (cdataMatch) {
                    styleContent = cdataMatch[1];
                }
            }
            // Replace common entities
            styleContent = styleContent
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            $(el).html(styleContent);
            console.log(`[Fetch Article] SVG style after unescape:`, $(el).html()?.substring(0, 150));
        }
    });
    // Also ensure animate and other SVG animation elements are preserved
    $content.find('svg animate, svg animateTransform, svg animateMotion, svg set').each((_, el) => {
        // Just log for debugging
        console.log(`[Fetch Article] SVG animation element found:`, $(el).prop('outerHTML')?.substring(0, 200));
    });

    console.log(`[Fetch Article] SVG debug after processing: found ${$content.find('svg').length} SVG elements`);
    $content.find('svg').each((i, el) => {
        // console.log(`[Fetch Article] SVG ${i} after processing:`, $(el).prop('outerHTML')?.substring(0, 300) + '...');
    });
    
    // BORDER MODULE FIX:
    // Some WeChat border modules use pseudo-elements (::before/::after) or complex nesting with background images.
    // We need to ensure we don't strip necessary structure.
    // Also, some modules rely on 'section' tags being preserved.
    // We already do a good job preserving structure, but let's double check for any specific "border" related cleanup.
    // Actually, the main issue is usually frontend not replicating styles correctly.
    // But here, we ensure we return the full structure.
    
    // WRAPPER PRESERVATION:
    // We need to return the #js_content wrapper itself if it has styles/classes, 
    // OR we just return the outerHTML of #js_content.
    // However, existing frontend expects inner content.
    // Let's check if #js_content has significant attributes.
    const wrapperStyle = $content.attr('style') || '';
    const wrapperClass = $content.attr('class') || '';
    
    let contentHtml = $content.html() || '';
    
    // If wrapper has styles/classes, wrap the content in a div with those attributes
    // BUT exclude visibility:hidden/opacity:0 which are common in WeChat initial state
    if (wrapperStyle || wrapperClass) {
        let safeStyle = wrapperStyle;
        if (safeStyle.includes('visibility: hidden') || safeStyle.includes('visibility:hidden')) {
            safeStyle = safeStyle.replace(/visibility\s*:\s*hidden/g, 'visibility: visible');
        }
        if (safeStyle.includes('opacity: 0') || safeStyle.includes('opacity:0')) {
             safeStyle = safeStyle.replace(/opacity\s*:\s*0/g, 'opacity: 1');
        }
        
        // We wrap it in a div that mimics #js_content behavior
        // We use id="js_content" again or a class to ensure styles match
        contentHtml = `<div id="js_content" class="${wrapperClass}" style="${safeStyle}">${contentHtml}</div>`;
    }

    console.log(`[Fetch Article] Processed content length: ${contentHtml.length}`);

    const body = {
      title,
      cover,
      desc,
      content: contentHtml,
      backgroundImages,
      styles,
      cssLinks,
    };
    articleCache.set(url, { body, cachedAt: Date.now() });
    const out = NextResponse.json(body);
    out.headers.set('X-Article-Cache', 'miss');
    return out;
    });

  } catch (error: any) {
    console.error(`[Fetch Article] Error: ${error.message}`);
    if (error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted')) {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
    }
    if (error?.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
