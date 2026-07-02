'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Scissors, RefreshCw, Check, AlertCircle, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import ImageCropper from '@/components/ImageCropper';
import { cn } from '@/lib/utils';

interface ArticleData {
  title: string;
  cover: string;
  desc: string;
  content: string;
  backgroundImages: string[];
  styles?: string;
  cssLinks?: string[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [croppedCover, setCroppedCover] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [previewStyles, setPreviewStyles] = useState('');
  const [previewCssLinks, setPreviewCssLinks] = useState<string[]>([]);
  const [previewCssText, setPreviewCssText] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
  const [useProxyInExport, setUseProxyInExport] = useState(false);
  const [inlineImagesInExport, setInlineImagesInExport] = useState(true);
  const [exportFormat, setExportFormat] = useState<'kindeditor' | 'full'>('full');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const fetchArticleControllerRef = useRef<AbortController | null>(null);
  
  // Configs
  const [config, setConfig] = useState({
    showFrontend: true,
    recommendHome: true,
    focusNews: true,
    category: '',
  });

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

  const fetchArticle = async () => {
    if (!url) return;
    setLoading(true);
    setError('');

    try {
      const cleanedUrl = normalizeArticleUrl(url);
      if (!cleanedUrl) throw new Error('请输入有效的微信文章链接');
      if (cleanedUrl !== url) setUrl(cleanedUrl);

      if (fetchArticleControllerRef.current) fetchArticleControllerRef.current.abort();
      const controller = new AbortController();
      fetchArticleControllerRef.current = controller;

      const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(cleanedUrl)}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '获取文章失败');
      }

      if (!data?.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('未解析到正文内容：可能是链接无效、文章已删除，或需要验证');
      }

      setArticle(data);
      setPreviewStyles(data.styles || '');
      setPreviewCssLinks(Array.isArray(data.cssLinks) ? data.cssLinks : []);
      
      const processedContent = processContentForPreview(data.content, cleanedUrl);
      if (!processedContent || processedContent.trim().length === 0) {
        throw new Error('预览渲染失败：正文为空或被样式隐藏');
      }
      setPreviewContent(processedContent);
      setCroppedCover('');

    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('aborted')) {
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
      fetchArticleControllerRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const { signal } = controller;
    const run = async () => {
      if (!previewCssLinks.length) {
        setPreviewCssText('');
        return;
      }
      const links = previewCssLinks.slice(0, 30).filter(Boolean);
      const limit = 4;
      const texts: string[] = new Array(links.length).fill('');
      let cursor = 0;
      const workers = new Array(Math.min(limit, links.length)).fill(0).map(async () => {
        for (;;) {
          if (cancelled || signal.aborted) return;
          const i = cursor;
          cursor += 1;
          if (i >= links.length) return;
          const href = links[i];
          try {
            const res = await fetch(`/api/proxy-css?url=${encodeURIComponent(href)}`, { signal });
            if (!res.ok) continue;
            const t = await res.text();
            texts[i] = t || '';
          } catch {
          }
        }
      });
      await Promise.all(workers);
      if (cancelled) return;
      setPreviewCssText(texts.filter(Boolean).join('\n'));
    };
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [previewCssLinks]);

  const processContentForPreview = (html: string, refererUrl: string) => {
    // We do simple string replacement for proxying to avoid DOMParser issues in SSR/Node (though this is client side)
    // But DOMParser is better for robustness.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const referer = refererUrl;
    
    // Replace all images with proxy
    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
      const srcAttr = img.getAttribute('src') || '';
      const dataSrcAttr = img.getAttribute('data-src') || '';
      const rawSrc = srcAttr || dataSrcAttr;
      const normalizedSrc = rawSrc.startsWith('//') ? `https:${rawSrc}` : rawSrc;
      if (normalizedSrc && (normalizedSrc.startsWith('http://') || normalizedSrc.startsWith('https://'))) {
        img.setAttribute('data-original-src', normalizedSrc);
        img.setAttribute('data-fallback-src', normalizedSrc);
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.setAttribute(
          'src',
          `${origin}/api/proxy-image?url=${encodeURIComponent(normalizedSrc)}&ref=${encodeURIComponent(referer)}&fallback=svg`
        );
      }
      img.removeAttribute('data-src');
    });

    // Handle background images in style
    const elementsWithStyle = doc.querySelectorAll('[style*="background-image"]');
    elementsWithStyle.forEach((el) => {
       const style = el.getAttribute('style') || '';
       if (style) el.setAttribute('data-original-style', style);
       const newStyle = style.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_match, _q, rawUrl) => {
           let normalized = typeof rawUrl === 'string' && rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
           
           if (typeof normalized === 'string' && (normalized.startsWith('http://') || normalized.startsWith('https://'))) {
             normalized = `${origin}/api/proxy-image?url=${encodeURIComponent(normalized)}&ref=${encodeURIComponent(referer)}&fallback=svg`;
           }
           
           // ESCAPE SINGLE QUOTES in the URL itself to prevent breaking the style='...' attribute
           if (normalized.includes("'")) {
               normalized = normalized.replace(/'/g, '%27');
           }

           return `url('${normalized}')`;
       });
       el.setAttribute('style', newStyle);
    });

    // 3. Ensure Visibility (Remove hidden attributes often found in WeChat articles)
    const hiddenEls = doc.querySelectorAll('[style*="visibility: hidden"]');
    hiddenEls.forEach(el => {
            el.setAttribute('style', el.getAttribute('style')?.replace('visibility: hidden', 'visibility: visible') || '');
    });
    
    // Fix opacity:0 often used for entrance animations
    const opacityEls = doc.querySelectorAll('[style*="opacity: 0"]');
    opacityEls.forEach(el => {
            el.setAttribute('style', el.getAttribute('style')?.replace(/opacity:\s*0/g, 'opacity: 1') || '');
    });

    // CRITICAL FIX: DOMParser moves <style> tags from body to head.
         // We must retrieve them and put them back into the content.
         const styles = Array.from(doc.head.querySelectorAll('style'))
             .map(style => style.outerHTML)
             .join('\n');
             
         // SVG Cleanup: WeChat SVGs often have 'data-src' which might confuse some renderers if not cleaned
         // Also ensure SVGs are visible
         const svgs = doc.querySelectorAll('svg');
         svgs.forEach(svg => {
             svg.removeAttribute('data-src');
             svg.style.visibility = 'visible';
             svg.style.opacity = '1';
         });
 
         return styles + doc.body.innerHTML;
    };

  const decodeProxyImageUrl = (maybeProxyUrl: string) => {
    try {
      const u = new URL(maybeProxyUrl);
      if (!u.pathname.includes('/api/proxy-image')) return maybeProxyUrl;
      const original = u.searchParams.get('url');
      return original ? decodeURIComponent(original) : maybeProxyUrl;
    } catch {
      return maybeProxyUrl;
    }
  };

  const toAbsoluteUrl = (maybeRelative: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!maybeRelative) return maybeRelative;
    if (maybeRelative.startsWith('data:')) return maybeRelative;
    if (maybeRelative.startsWith('http://') || maybeRelative.startsWith('https://')) return maybeRelative;
    if (maybeRelative.startsWith('//')) return `https:${maybeRelative}`;
    if (maybeRelative.startsWith('/')) return `${origin}${maybeRelative}`;
    return maybeRelative;
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const optimizeImageBlobForKindEditor = async (blob: Blob) => {
    const mustCompress = blob.type === 'image/gif' || blob.size > 350 * 1024;
    if (!mustCompress || typeof document === 'undefined') return blob;

    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new window.Image();
      image.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('图片解码失败'));
        image.src = objectUrl;
      });

      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / Math.max(1, image.naturalWidth));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return blob;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      const compressed = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.82);
      });
      return compressed && compressed.size < blob.size ? compressed : blob;
    } catch {
      return blob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const inlineImagesToDataUrl = async (html: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
    const root = doc.getElementById('__root__');
    if (!root) return html;

    const fetchAsBlob = async (src: string) => {
      const abs = toAbsoluteUrl(src);
      if (!abs) return null;
      if (abs.startsWith('data:')) return null;
      const proxyUrl =
        abs.includes('/api/proxy-image')
          ? abs
          : `${origin}/api/proxy-image?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return null;
      return await res.blob();
    };

    const imgs = Array.from(root.querySelectorAll('img[src]'));
    for (const img of imgs) {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) continue;
      try {
        const blob = await fetchAsBlob(src);
        if (!blob) continue;
        const optimized = await optimizeImageBlobForKindEditor(blob);
        const dataUrl = await blobToDataUrl(optimized);
        if (dataUrl) img.setAttribute('src', dataUrl);
      } catch {}
    }

    const nodesWithStyle = Array.from(root.querySelectorAll<HTMLElement>('[style*="url("]'));
    for (const el of nodesWithStyle) {
      const style = el.getAttribute('style') || '';
      if (!style) continue;
      const matches = Array.from(style.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g));
      if (!matches.length) continue;
      let nextStyle = style;
      for (const m of matches) {
        const raw = m[0];
        const u = m[2] || '';
        if (!u || u.startsWith('data:')) continue;
        try {
          const blob = await fetchAsBlob(u);
          if (!blob) continue;
          const optimized = await optimizeImageBlobForKindEditor(blob);
          const dataUrl = await blobToDataUrl(optimized);
          if (!dataUrl) continue;
          nextStyle = nextStyle.replace(raw, `url('${dataUrl.replace(/'/g, '%27')}')`);
        } catch {}
      }
      el.setAttribute('style', nextStyle);
    }

    return root.innerHTML;
  };

  const buildInlineStyledHtmlFromIframe = () => {
    const iframe = previewIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return '';

    const sourceRoot =
      (doc.querySelector('#js_content') as HTMLElement | null) ||
      (doc.querySelector('.rich_media_content') as HTMLElement | null) ||
      doc.body;

    const cloneRoot = sourceRoot.cloneNode(true) as HTMLElement;

    const srcAll = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll('*'))] as HTMLElement[];
    const dstAll = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll('*'))] as HTMLElement[];
    const count = Math.min(srcAll.length, dstAll.length);

    const props = [
      'display',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'justify-content',
      'align-items',
      'gap',
      'flex-direction',
      'flex-wrap',
      'box-sizing',
      'width',
      'height',
      'max-width',
      'min-width',
      'min-height',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'border-top-width',
      'border-top-style',
      'border-top-color',
      'border-right-width',
      'border-right-style',
      'border-right-color',
      'border-bottom-width',
      'border-bottom-style',
      'border-bottom-color',
      'border-left-width',
      'border-left-style',
      'border-left-color',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
      'background-color',
      'background-image',
      'background-position',
      'background-size',
      'background-repeat',
      'background-attachment',
      'color',
      'opacity',
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'text-align',
      'text-indent',
      'text-decoration',
      'letter-spacing',
      'white-space',
      'word-break',
      'overflow',
      'vertical-align',
      'transform',
      'box-shadow',
      'z-index',
    ];

    // SVG Support: Add SVG specific properties
    const svgProps = [
        'fill',
        'stroke',
        'stroke-width',
        'stroke-dasharray',
        'stroke-dashoffset',
        'stroke-linecap',
        'stroke-linejoin',
        'd',
        'viewBox',
        'preserveAspectRatio',
        'x',
        'y',
        'cx',
        'cy',
        'r',
        'rx',
        'ry',
        'x1',
        'y1',
        'x2',
        'y2',
        'points',
        'transform-origin',
        'vector-effect'
    ];

    // Combine all props
    const allProps = [...props, ...svgProps];
    const visualDefaults: Record<string, string[]> = {
      display: ['inline'],
      position: ['static'],
      top: ['auto'],
      right: ['auto'],
      bottom: ['auto'],
      left: ['auto'],
      'justify-content': ['normal', 'flex-start'],
      'align-items': ['normal', 'stretch'],
      gap: ['normal', '0px'],
      'flex-direction': ['row'],
      'flex-wrap': ['nowrap'],
      width: ['auto'],
      height: ['auto'],
      'max-width': ['none'],
      'min-width': ['0px'],
      'min-height': ['0px'],
      'background-color': ['rgba(0, 0, 0, 0)', 'transparent'],
      'background-image': ['none'],
      'background-position': ['0% 0%'],
      'background-size': ['auto'],
      'background-repeat': ['repeat'],
      color: ['rgb(0, 0, 0)'],
      opacity: ['1'],
      'font-style': ['normal'],
      'font-weight': ['400'],
      'text-align': ['start'],
      'text-indent': ['0px'],
      'text-decoration': ['none solid rgb(0, 0, 0)', 'none'],
      'letter-spacing': ['normal'],
      'white-space': ['normal'],
      'word-break': ['normal'],
      overflow: ['visible'],
      'vertical-align': ['baseline'],
      transform: ['none'],
      'box-shadow': ['none'],
      'z-index': ['auto'],
    };

    const shouldKeepComputedStyle = (prop: string, val: string, srcEl: HTMLElement) => {
      const v = (val || '').trim();
      if (!v) return false;
      if (/^border-.*-(width|style|color)$/.test(prop)) return false;
      if (/^margin-/.test(prop) || /^padding-/.test(prop)) return false;
      if (/^border-.*-radius$/.test(prop) && v === '0px') return false;
      if (visualDefaults[prop]?.includes(v)) return false;
      if (prop === 'display' && srcEl.tagName.toLowerCase() === 'span' && v === 'inline') return false;
      return true;
    };

    // Convert section/fieldset tags to div for CMS compatibility
    // We strictly preserve all attributes to maintain visual fidelity.
    const convertTags = (root: HTMLElement) => {
      // Tags to convert
      const tagsToConvert = ['section', 'fieldset', 'aside', 'figure', 'figcaption', 'article', 'header', 'footer'];
      
      // We must querySelectorAll on the original doc context or handle it carefully
      // Since 'root' is already a clone, we can manipulate it directly.
      
      // Helper to convert a single element
      const convertElement = (el: HTMLElement) => {
          const div = doc.createElement('div');
          
          // Copy all attributes
          Array.from(el.attributes).forEach((attr) => {
             div.setAttribute(attr.name, attr.value);
          });
          
          // Copy style specifically if not in attributes (though it should be)
          // The previous steps already inlined styles into the 'style' attribute.
          
          // Move children
          while (el.firstChild) {
             div.appendChild(el.firstChild);
          }
          
          if (el.parentNode) {
              el.parentNode.replaceChild(div, el);
          }
          return div;
      };

      // Process root if needed
      let currentRoot = root;
      if (tagsToConvert.includes(currentRoot.tagName.toLowerCase())) {
          currentRoot = convertElement(currentRoot);
      }

      // Process descendants
      // Note: We need to do this in reverse order or be careful about live nodelists
      // querySelectorAll returns a static NodeList, so it's safe to iterate
      const elements = Array.from(currentRoot.querySelectorAll(tagsToConvert.join(',')));
      elements.forEach(el => {
          convertElement(el as HTMLElement);
      });

      // Ensure all links open in new tab
      const links = Array.from(currentRoot.querySelectorAll('a'));
      links.forEach(a => {
          a.setAttribute('target', '_blank');
      });

      return currentRoot;
    };

    // Helper to reconstruct border/margin/padding shorthands
    const reconstructShorthand = (
        computed: CSSStyleDeclaration, 
        prefix: 'border-top' | 'border-right' | 'border-bottom' | 'border-left' | 'margin' | 'padding',
        type?: 'width' | 'style' | 'color'
    ) => {
        if (prefix === 'margin' || prefix === 'padding') {
             const t = computed.getPropertyValue(`${prefix}-top`);
             const r = computed.getPropertyValue(`${prefix}-right`);
             const b = computed.getPropertyValue(`${prefix}-bottom`);
             const l = computed.getPropertyValue(`${prefix}-left`);
             if (t === r && t === b && t === l) return t;
             return `${t} ${r} ${b} ${l}`;
        }
        return '';
    };

    const getBorderShorthand = (computed: CSSStyleDeclaration) => {
        // Try all sides uniform first (cleanest)
        const sides = ['top', 'right', 'bottom', 'left'];
        const width = computed.getPropertyValue('border-top-width');
        const style = computed.getPropertyValue('border-top-style');
        const color = computed.getPropertyValue('border-top-color');

        const isUniform = sides.every(side => 
            computed.getPropertyValue(`border-${side}-width`) === width &&
            computed.getPropertyValue(`border-${side}-style`) === style &&
            computed.getPropertyValue(`border-${side}-color`) === color
        );

        if (isUniform && width !== '0px' && style !== 'none') {
            return `border:${width} ${style} ${color};`;
        }
        
        // If not uniform, reconstruct each side shorthand (border-left: 4px solid blue)
        // This fixes issues where CMSs ignore longhand properties like border-left-width
        let borderStyles = '';
        sides.forEach(side => {
            const w = computed.getPropertyValue(`border-${side}-width`);
            const s = computed.getPropertyValue(`border-${side}-style`);
            const c = computed.getPropertyValue(`border-${side}-color`);
            if (w !== '0px' && s !== 'none') {
                borderStyles += `border-${side}:${w} ${s} ${c};`;
            }
        });
        
        return borderStyles;
    };

    const pseudoProps = [
      'display',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'border-top-width',
      'border-top-style',
      'border-top-color',
      'border-right-width',
      'border-right-style',
      'border-right-color',
      'border-bottom-width',
      'border-bottom-style',
      'border-bottom-color',
      'border-left-width',
      'border-left-style',
      'border-left-color',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
      'background-color',
      'background-image',
      'background-position',
      'background-size',
      'background-repeat',
      'color',
      'opacity',
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'letter-spacing',
      'text-align',
      'text-decoration',
      'transform',
      'box-shadow',
      'z-index',
      'white-space',
      'word-break',
      'overflow',
      'overflow-x',
      'overflow-y',
      'box-sizing',
      'content',
    ];

    const normalizePseudoContent = (content: string) => {
      const c = (content || '').trim();
      if (!c || c === 'none' || c === 'normal') return '';
      if ((c.startsWith('"') && c.endsWith('"')) || (c.startsWith("'") && c.endsWith("'"))) {
        return c.slice(1, -1);
      }
      return c;
    };

    const applyPseudo = (srcEl: HTMLElement, dstEl: HTMLElement, pseudo: '::before' | '::after') => {
      const computed = doc.defaultView?.getComputedStyle(srcEl, pseudo);
      if (!computed) return;
      const content = normalizePseudoContent(computed.getPropertyValue('content'));
      const bg = computed.getPropertyValue('background-image');
      const w = computed.getPropertyValue('width');
      const h = computed.getPropertyValue('height');
      const hasSize =
        Boolean(w && w !== 'auto' && w !== '0px') ||
        Boolean(h && h !== 'auto' && h !== '0px');
      const hasBorder =
        computed.getPropertyValue('border-top-style') !== 'none' ||
        computed.getPropertyValue('border-right-style') !== 'none' ||
        computed.getPropertyValue('border-bottom-style') !== 'none' ||
        computed.getPropertyValue('border-left-style') !== 'none';
      const hasVisible = Boolean(content) || (bg && bg !== 'none') || hasBorder || hasSize;
      if (!content && !hasVisible) return;

      const span = doc.createElement('span');
      if (content) span.textContent = content;
      let styleStr = '';
      pseudoProps.forEach((p) => {
        if (p === 'content') return;
        const val = computed.getPropertyValue(p);
        
        // Fix for absolute positioned pseudo-elements (often used for borders/decorations)
        if (p === 'position' && val === 'absolute') {
            // Ensure parent has position relative or absolute
            const parentStyle = dstEl.getAttribute('style') || '';
            if (!parentStyle.includes('position:')) {
                dstEl.style.position = 'relative';
            }
        }
        
        if (val && shouldKeepComputedStyle(p, val, srcEl)) styleStr += `${p}:${val};`;
      });
      // Ensure pseudo element has display block/inline-block if needed
      if (!styleStr.includes('display:')) {
          styleStr += 'display:block;';
      }
      
      styleStr += 'pointer-events:none;';
      span.setAttribute('style', styleStr);
      if (pseudo === '::before') dstEl.insertBefore(span, dstEl.firstChild);
      else dstEl.appendChild(span);
    };

    for (let i = 0; i < count; i++) {
      const srcEl = srcAll[i];
      const dstEl = dstAll[i];
      const computed = doc.defaultView?.getComputedStyle(srcEl);
      if (!computed) continue;

      const hasRealContent =
        Boolean((srcEl.textContent || '').trim()) ||
        Boolean(srcEl.querySelector('img,svg,video,iframe,table'));
      const computedWidth = parseFloat(computed.getPropertyValue('width') || '0');
      const computedHeight = parseFloat(computed.getPropertyValue('height') || '0');
      const computedBgImage = computed.getPropertyValue('background-image');
      const computedBgColor = computed.getPropertyValue('background-color');
      const isLargeEmptyBlock =
        !hasRealContent &&
        computedWidth > 120 &&
        computedHeight > 12 &&
        (!computedBgImage || computedBgImage === 'none') &&
        (!computedBgColor ||
          computedBgColor === 'rgba(0, 0, 0, 0)' ||
          computedBgColor === 'transparent' ||
          computedBgColor === 'rgb(255, 255, 255)');
      if (isLargeEmptyBlock) {
        dstEl.remove();
        continue;
      }

      let styleStr = (srcEl.getAttribute('style') || '').trim();
      if (styleStr && !styleStr.endsWith(';')) styleStr += ';';
      
      // Try border shorthand
      const border = getBorderShorthand(computed);
      if (border) {
          styleStr += border;
      } else {
          const sides = ['top', 'right', 'bottom', 'left'];
          sides.forEach((side) => {
            const w = computed.getPropertyValue(`border-${side}-width`);
            const s = computed.getPropertyValue(`border-${side}-style`);
            const c = computed.getPropertyValue(`border-${side}-color`);
            if (w !== '0px' && s !== 'none') styleStr += `border-${side}:${w} ${s} ${c};`;
          });
      }

      // Try margin/padding shorthands
      ['margin', 'padding'].forEach(prop => {
          // @ts-ignore
          const shorthand = reconstructShorthand(computed, prop);
          if (shorthand) {
              styleStr += `${prop}:${shorthand};`;
          } else {
               allProps.filter(p => p.startsWith(`${prop}-`)).forEach(p => {
                  const val = computed.getPropertyValue(p);
                  if (val && val !== '0px') styleStr += `${p}:${val};`;
              });
          }
      });

      // Add other props (excluding border/margin/padding which we handled)
      // Use allProps to include SVG properties
      allProps.filter(p => !p.startsWith('border-') && !p.startsWith('margin') && !p.startsWith('padding')).forEach((p) => {
        let val = computed.getPropertyValue(p);
        
        // Fix SVG specific attributes
        // computedStyle won't return SVG attributes like 'x', 'y', 'd' etc.
        // We need to get them from attributes for SVG elements
        if (srcEl instanceof SVGElement && svgProps.includes(p)) {
             const attrVal = srcEl.getAttribute(p);
             if (attrVal) {
                 // It's an attribute, not style, but we add it to style? 
                 // NO, SVG attributes should remain as attributes.
                 // We should NOT add them to style string.
                 return; 
             }
        }

        // Fix font-family: Force WeChat-like stack if generic or system-ui
        if (p === 'font-family') {
            // Always prepend the safe stack to ensure cross-platform consistency
            // The original computed value might be "system-ui" which fails on some Windows CMS
            // IMPORTANT: Use single quotes for font names to avoid breaking the style="..." double quoted attribute!
            val = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif`;
        }
        
        // Fix line-height: If normal, force a number (1.6 is standard for readability)
        // Removed aggressive line-height normalization to fix layout issues (e.g. titles in bars)
        /*
        if (p === 'line-height') {
             // If normal, default to 1.6
             if (val === 'normal') {
                 val = '1.6';
             } else if (val.endsWith('px')) {
                 // Convert pixel line-height to unitless if possible
                 const fontSize = computed.getPropertyValue('font-size');
                 if (fontSize && fontSize.endsWith('px')) {
                     const fs = parseFloat(fontSize);
                     const lh = parseFloat(val);
                     if (fs > 0) {
                         // Round to 2 decimal places
                         val = (lh / fs).toFixed(2);
                         // If < 1.4, boost it to 1.5 for readability unless explicitly tight
                         if (parseFloat(val) < 1.4) val = '1.5';
                     }
                 }
             }
        }
        */

        // Fix letter-spacing: If normal, default to 1px to avoid "squeezed" look
        // Removed aggressive letter-spacing normalization
        /*
        if (p === 'letter-spacing' && val === 'normal') {
            val = '1px';
        }
        */

        // Fix text-align: justify often causes issues in some editors, fallback to left if needed?
        // But WeChat uses justify often. We keep it.

        if (shouldKeepComputedStyle(p, val, srcEl)) styleStr += `${p}:${val};`;
      });
      
      // Ensure box-sizing is present if not default
      if (computed.boxSizing === 'border-box') {
          styleStr += 'box-sizing:border-box;';
      }

      dstEl.setAttribute('style', styleStr);
      
      // Preserve SVG attributes
      if (srcEl instanceof SVGElement) {
          Array.from(srcEl.attributes).forEach(attr => {
              // Don't overwrite style, class, id (style is already handled, class/id are stripped)
              if (attr.name !== 'style' && attr.name !== 'class' && attr.name !== 'id' && !attr.name.startsWith('data-')) {
                  dstEl.setAttribute(attr.name, attr.value);
              }
          });
      }
      
      // Preserve class for GIF images to keep animations if controlled by class (rare but possible)
      // Also, WeChat uses classes like '__bg_gif' to mark background gifs.
      const className = srcEl.getAttribute('class');
      if (className && (className.includes('gif') || className.includes('wxw-img') || className.includes('__bg_gif'))) {
          // Keep these classes as they are important for identification
          // But styles are already inlined
      }
      
      // Fix for background-image visibility (GIF tail images often use this)
      const bgImage = computed.getPropertyValue('background-image');
      if (bgImage && bgImage !== 'none' && (bgImage.includes('gif') || className?.includes('__bg_gif'))) {
          // Ensure it has display block or inline-block and size
          if (!styleStr.includes('display:') && computed.getPropertyValue('display') === 'inline') {
             styleStr += 'display:inline-block;';
             dstEl.setAttribute('style', styleStr);
          }
          // Check for width/height
          const w = computed.getPropertyValue('width');
          const h = computed.getPropertyValue('height');
          if ((!w || w === '0px' || w === 'auto') && (!h || h === '0px' || h === 'auto')) {
             // If it has background but no size, it might rely on content or padding.
             // Force a minimum size if it looks like a standalone background element
             if (!srcEl.textContent?.trim()) {
                 styleStr += 'min-width: 20px; min-height: 20px;'; 
                 dstEl.setAttribute('style', styleStr);
             }
          }
      }

      // Special handling for images:
      // If it's an img tag, ensure width/height attributes are preserved if they exist on source
      if (srcEl.tagName.toLowerCase() === 'img') {
          const w = srcEl.getAttribute('width');
          const h = srcEl.getAttribute('height');
          if (w) dstEl.setAttribute('width', w);
          if (h) dstEl.setAttribute('height', h);
          
          // Also preserve data-ratio and data-w if needed for some editors
          const ratio = srcEl.getAttribute('data-ratio');
          if (ratio) dstEl.setAttribute('data-ratio', ratio);
          const dataW = srcEl.getAttribute('data-w');
          if (dataW) dstEl.setAttribute('data-w', dataW);
      }
      
      // Empty element fix:
      // Some border elements are empty sections with small height/width.
      // If they have background/border but no content, ensure they don't collapse.
      if (!srcEl.hasChildNodes() && srcEl.tagName.toLowerCase() !== 'img' && srcEl.tagName.toLowerCase() !== 'br' && srcEl.tagName.toLowerCase() !== 'hr') {
          const w = computed.getPropertyValue('width');
          const h = computed.getPropertyValue('height');
          const hasDim = (w && w !== 'auto' && w !== '0px') || (h && h !== 'auto' && h !== '0px');
          const hasStyle = computed.getPropertyValue('border-width') !== '0px' || computed.getPropertyValue('background-image') !== 'none' || computed.getPropertyValue('background-color') !== 'rgba(0, 0, 0, 0)';
          
          if (hasStyle && !hasDim) {
               // Force a minimum size if it has style but no dimension and no content
               if (!styleStr.includes('min-height') && !styleStr.includes('height')) {
                   styleStr += 'min-height: 1em;'; 
                   dstEl.setAttribute('style', styleStr);
               }
          }
      }

      dstEl.removeAttribute('class');
      dstEl.removeAttribute('id');

      // KindEditor often turns materialized pseudo-elements into full-width empty
      // blocks. Keeping the real element styles is more stable than converting
      // ::before/::after into HTML nodes.
    }

    const imgNodes = Array.from(cloneRoot.querySelectorAll('img'));
    imgNodes.forEach((img) => {
      const original = img.getAttribute('data-original-src');
      const src = img.getAttribute('src') || '';
      
      // Set referrer policy for all images to ensure they load
      img.setAttribute('referrerpolicy', 'no-referrer');
      
      if (useProxyInExport) {
         // Use proxy URL for export (combine layout + working images)
         // Ensure it's an absolute URL including localhost
         const origin = typeof window !== 'undefined' ? window.location.origin : '';
         if (src.includes('/api/proxy-image')) {
            // It's already a proxy URL (relative or absolute)
            if (src.startsWith('http')) {
               img.setAttribute('src', src);
            } else {
               img.setAttribute('src', `${origin}${src}`);
            }
         } else if (original) {
            // It was replaced by original, convert back to proxy
            img.setAttribute('src', `${origin}/api/proxy-image?url=${encodeURIComponent(original)}&ref=${encodeURIComponent(url)}`);
         }
      } else {
          // Restore original WeChat URL
          if (original) img.setAttribute('src', original);
          else if (src.includes('/api/proxy-image')) img.setAttribute('src', decodeProxyImageUrl(src));
      }

      img.removeAttribute('data-original-src');
      img.removeAttribute('data-src');
    });

    const styledNodes = Array.from(cloneRoot.querySelectorAll('[style*="url("]'));
    styledNodes.forEach((el) => {
      const style = el.getAttribute('style') || '';
      const restored = style.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, _q, u) => {
        // FORCE SINGLE QUOTES for best compatibility with HTML style="..." attributes
        const q = "'";
        if (useProxyInExport) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            // If it's already a proxy url, ensure absolute
            if (u.includes('/api/proxy-image')) {
                return `url(${q}${u.startsWith('http') ? u : origin + u}${q})`;
            }
            // If it's original, wrap it
            return `url(${q}${origin}/api/proxy-image?url=${encodeURIComponent(u)}&ref=${encodeURIComponent(url)}${q})`;
        } else {
            const decoded = typeof u === 'string' && u.includes('/api/proxy-image') ? decodeProxyImageUrl(u) : u;
            return `url(${q}${decoded}${q})`;
        }
      });
      el.setAttribute('style', restored);
      el.removeAttribute('data-original-style');
    });

    const finalRoot = convertTags(cloneRoot);

    const stabilizeCmsLayout = (root: HTMLElement) => {
      const parsePx = (v: string) => {
        const m = String(v || '').trim().match(/^(-?\d+(?:\.\d+)?)px$/);
        if (!m) return 0;
        return Number(m[1] || 0);
      };

      const getStyleValue = (style: string, name: string) => {
        const re = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i');
        const m = String(style || '').match(re);
        return (m && m[1] ? String(m[1]).trim() : '').toLowerCase();
      };

      const isImageOnlyBlock = (el: HTMLElement) => {
        const hasMeaningfulText = Array.from(el.childNodes).some((n) => {
          if (n.nodeType === Node.TEXT_NODE) return Boolean((n.textContent || '').trim());
          return false;
        });
        if (hasMeaningfulText) return false;
        const imgs = Array.from(el.querySelectorAll('img'));
        return imgs.length >= 1;
      };

      const candidates = Array.from(root.querySelectorAll<HTMLElement>('[style*="display"]')).filter((el) => {
        const style = (el.getAttribute('style') || '').toLowerCase();
        return style.includes('display:flex') || style.includes('display: flex') || style.includes('display:grid') || style.includes('display: grid');
      });

      candidates.reverse().forEach((container) => {
        const children = Array.from(container.children).filter((n) => n instanceof HTMLElement) as HTMLElement[];
        if (children.length < 2 || children.length > 4) return;
        if (!children.every(isImageOnlyBlock)) return;

        const style = container.getAttribute('style') || '';
        const gapVal = getStyleValue(style, 'gap') || getStyleValue(style, 'column-gap');
        const gapPx = parsePx(gapVal);
        const halfGap = gapPx ? Math.max(0, Math.round(gapPx / 2)) : 0;

        const table = doc.createElement('table');
        table.setAttribute('style', 'width:100%;border-collapse:collapse;table-layout:fixed;');
        table.setAttribute('cellpadding', '0');
        table.setAttribute('cellspacing', '0');
        const tr = doc.createElement('tr');
        table.appendChild(tr);

        children.forEach((child, idx) => {
          const td = doc.createElement('td');
          td.setAttribute('style', `vertical-align:top;padding:${halfGap ? `0 ${idx === 0 ? halfGap : 0}px 0 ${idx === children.length - 1 ? halfGap : 0}px` : '0'};`);
          const childStyle = child.getAttribute('style') || '';
          const w = getStyleValue(childStyle, 'width');
          if (w && w.includes('%')) td.setAttribute('width', w);
          while (child.firstChild) td.appendChild(child.firstChild);
          tr.appendChild(td);
          child.remove();
        });

        container.style.display = 'block';
        container.style.justifyContent = '';
        container.style.alignItems = '';
        container.style.alignContent = '';
        container.style.gap = '';
        (container.style as any).columnGap = '';
        (container.style as any).rowGap = '';
        container.appendChild(table);

        const imgs = Array.from(container.querySelectorAll('img'));
        imgs.forEach((img) => {
          const s = img.getAttribute('style') || '';
          if (!s.toLowerCase().includes('max-width')) img.style.maxWidth = '100%';
          if (!s.toLowerCase().includes('height')) img.style.height = 'auto';
          if (!s.toLowerCase().includes('display')) img.style.display = 'block';
        });
      });
    };

    stabilizeCmsLayout(finalRoot);
    return finalRoot.outerHTML;
  };

  const buildCmsHtml = () => {
    if (!article) return '';

    // Content Pre-processing: Clean and prepare HTML for CMS
    // Requirement: data-src -> src, handle anti-hotlinking, preserve structure
    const preProcessArticleContent = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const decodeProxyImageUrlLoose = (maybeProxy: string) => {
          const s = (maybeProxy || '').trim();
          if (!s) return s;
          if (!s.includes('/api/proxy-image')) return s;
          try {
            const u = new URL(s.startsWith('http') ? s : `${origin}${s.startsWith('/') ? '' : '/'}${s}`);
            const original = u.searchParams.get('url');
            return original ? decodeURIComponent(original) : s;
          } catch {
            const idx = s.indexOf('?');
            if (idx < 0) return s;
            try {
              const sp = new URLSearchParams(s.slice(idx + 1));
              const original = sp.get('url');
              return original ? decodeURIComponent(original) : s;
            } catch {
              return s;
            }
          }
        };

        // 1. Data-src Cleaning & Anti-hotlinking Handling
        const images = doc.querySelectorAll('img');
        images.forEach((img) => {
          const srcAttr = img.getAttribute('src') || '';
          const dataSrcAttr = img.getAttribute('data-src') || '';
          const rawSrc = srcAttr || dataSrcAttr;
          
          // Ensure we have a valid source
          let normalizedSrc = rawSrc.startsWith('//') ? `https:${rawSrc}` : rawSrc;
          
          if (normalizedSrc) {
            if (useProxyInExport) {
                // If using proxy, convert to proxy URL
                // We need to encode the original URL
                if (!normalizedSrc.includes('/api/proxy-image')) {
                    normalizedSrc = `${origin}/api/proxy-image?url=${encodeURIComponent(normalizedSrc)}&ref=${encodeURIComponent(url)}`;
                } else if (normalizedSrc.startsWith('/')) {
                    // Ensure absolute path for proxy
                    normalizedSrc = `${origin}${normalizedSrc}`;
                }
            } else {
                normalizedSrc = decodeProxyImageUrlLoose(normalizedSrc);
            }
            img.setAttribute('src', normalizedSrc);
          }
          
          // Clean up WeChat attributes
          img.removeAttribute('data-src');
          img.removeAttribute('data-type');
          img.removeAttribute('data-w');
          img.removeAttribute('data-ratio');
          
          // Add referrer policy to help with hotlinking if not proxied
          img.setAttribute('referrerpolicy', 'no-referrer');
        });

        // 2. Handle Background Images (Style Attributes)
         const elementsWithStyle = doc.querySelectorAll('[style*="background-image"]');
         elementsWithStyle.forEach((el) => {
           const style = el.getAttribute('style') || '';
           // Regex to handle url() and ensure single quotes for safety
           const newStyle = style.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_match, _q, rawUrl) => {
             let normalized = typeof rawUrl === 'string' && rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
             
             if (useProxyInExport) {
                 if (!normalized.includes('/api/proxy-image') && !normalized.startsWith('data:')) {
                     normalized = `${origin}/api/proxy-image?url=${encodeURIComponent(normalized)}&ref=${encodeURIComponent(url)}`;
                 } else if (normalized.startsWith('/') && !normalized.startsWith('//')) {
                      normalized = `${origin}${normalized}`;
                 }
             } else {
                  normalized = decodeProxyImageUrlLoose(normalized);
             }

             // ESCAPE SINGLE QUOTES in the URL itself to prevent breaking the style='...' attribute
             // This is crucial for Data URIs containing SVG markup with single quotes
             if (normalized.includes("'")) {
                 normalized = normalized.replace(/'/g, '%27');
             }

             return `url('${normalized}')`;
           });
           el.setAttribute('style', newStyle);
         });
        
        // 3. Ensure Visibility (Remove hidden attributes often found in WeChat articles)
        const hiddenEls = doc.querySelectorAll('[style*="visibility: hidden"]');
        hiddenEls.forEach(el => {
             el.setAttribute('style', el.getAttribute('style')?.replace('visibility: hidden', 'visibility: visible') || '');
        });
        
        // Fix opacity:0 often used for entrance animations
        const opacityEls = doc.querySelectorAll('[style*="opacity: 0"]');
        opacityEls.forEach(el => {
             el.setAttribute('style', el.getAttribute('style')?.replace(/opacity:\s*0/g, 'opacity: 1') || '');
        });

        // CRITICAL FIX: DOMParser moves <style> tags from body to head.
        // We must retrieve them and put them back into the content.
        const styles = Array.from(doc.head.querySelectorAll('style'))
            .map(style => style.outerHTML)
            .join('\n');
            
        // SVG Cleanup: WeChat SVGs often have 'data-src' which might confuse some renderers if not cleaned
        // Also ensure SVGs are visible
        const svgs = doc.querySelectorAll('svg');
        svgs.forEach(svg => {
            svg.removeAttribute('data-src');
            svg.style.visibility = 'visible';
            svg.style.opacity = '1';
        });

        return styles + doc.body.innerHTML;
    };

    // Step 1: Pre-process content (Cleaning)
    const cleanedContent = preProcessArticleContent(article.content);
    
    // Step 2: Add CSS (WeChat CSS + Custom Styles)
    // User requested to inject WeChat CSS into the editor container. 
    // We do this by prepending a <style> block.
    // ADDED: Force WeChat font stack on body to fix font issues
    // ADDED: Force img visibility to prevent hidden images
    // Also force .wxw-img to be visible
    // Apply the WeChat font stack to the article root and its descendants
    // rather than only to <body>. Editors like KindEditor wrap pasted content
    // in their own body, which would otherwise override the font we set here.
    // Letter-spacing: WeChat articles use a slightly wider spacing for readability.
    const wechatFontStack = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif";
    const forceVisibleCss =
      `html,body{visibility:visible!important;opacity:1!important;}
       #js_content,.rich_media_content,#js_content *,.rich_media_content *{visibility:visible!important;opacity:1!important;font-family:${wechatFontStack}!important;letter-spacing:.5px!important;}
       img,.wxw-img{visibility:visible!important;opacity:1!important;display:inline-block!important;}`;

    // Apply the WeChat typography defaults as inline styles on the article
    // root and its descendants. This is a belt-and-suspenders fallback for
    // editors (notably KindEditor) that strip <style> blocks on paste. Even
    // if the <style> above is dropped, the font will still follow the content
    // because it is now an inline style on the elements themselves.
    let enhancedContent = cleanedContent;
    try {
      const fontParser = new DOMParser();
      const fontDoc = fontParser.parseFromString(`<div>${cleanedContent}</div>`, 'text/html');
      const fontRoot = fontDoc.querySelector('div');
      const articleRoot = fontRoot?.querySelector('#js_content, .rich_media_content');
      if (articleRoot) {
        const existingStyle = articleRoot.getAttribute('style') || '';
        articleRoot.setAttribute(
          'style',
          `font-family:${wechatFontStack} !important;letter-spacing:.5px;${existingStyle}`
        );
        articleRoot.querySelectorAll<HTMLElement>('*').forEach((el) => {
          if (!el.style.fontFamily) {
            el.style.fontFamily = wechatFontStack;
          }
        });
      }
      if (fontRoot) {
        // DOMParser hoists <style> tags from the body to the head, so re-attach
        // them at the front of the serialized content to survive KindEditor.
        const styleTags = Array.from(fontDoc.head.querySelectorAll('style'))
          .map(st => st.outerHTML)
          .join('\n');
        enhancedContent = styleTags + fontRoot.innerHTML;
      }
    } catch (e) {
      console.warn('Inline font enhancement failed', e);
    }

    const css = `${previewStyles}\n${forceVisibleCss}`.trim();
    const head = css ? `<style>\n/* WeChat CSS & Custom Styles */\n${css}\n</style>\n` : '';
    
    return `${head}${enhancedContent}`;
  };

  const buildKindEditorHtml = async () => {
    const sourceHtml = buildCmsHtml();
    if (!sourceHtml) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="__kindeditor_root__">${sourceHtml}</div>`, 'text/html');
    const root = doc.getElementById('__kindeditor_root__');
    if (!root) return sourceHtml;

    // Keep the same measure as the WeChat article canvas. Without this,
    // the website stretches paragraphs and changes line breaks, spacing and
    // the apparent font size even when the original inline styles survive.
    const articleRoot = root.querySelector<HTMLElement>('#js_content, .rich_media_content');
    if (articleRoot) {
      articleRoot.style.width = '100%';
      articleRoot.style.maxWidth = '677px';
      articleRoot.style.marginLeft = 'auto';
      articleRoot.style.marginRight = 'auto';
      articleRoot.style.boxSizing = 'border-box';
      articleRoot.style.overflow = 'hidden';
    }

    // KindEditor strips or rewrites the CSS features used by 135 editor
    // templates (gradients, pseudo-elements, SVG decorations and transforms).
    // Capture only those decorative modules from the live WeChat preview so
    // their appearance is stable; normal article text stays editable HTML.
    const previewDoc = previewIframeRef.current?.contentDocument;
    if (previewDoc?.body) {
      const sourceModules = Array.from(
        previewDoc.querySelectorAll<HTMLElement>('[data-tools="135编辑器"]')
      );
      const targetModules = Array.from(
        root.querySelectorAll<HTMLElement>('[data-tools="135编辑器"]')
      );

      if (sourceModules.length && targetModules.length) {
        try {
          await previewDoc.fonts?.ready;
        } catch {}

        const { default: html2canvas } = await import('html2canvas');
        const count = Math.min(sourceModules.length, targetModules.length);

        for (let index = 0; index < count; index += 1) {
          const sourceModule = sourceModules[index];
          const targetModule = targetModules[index];
          const rect = sourceModule.getBoundingClientRect();

          // Large wrappers may contain substantial editable article content.
          // Keep those as HTML and only freeze normal-sized layout components.
          if (rect.width < 20 || rect.height < 10 || rect.height > 1200) continue;

          const moduleImages = Array.from(sourceModule.querySelectorAll<HTMLImageElement>('img'));
          await Promise.all(
            moduleImages.map(
              (img) =>
                img.complete
                  ? Promise.resolve()
                  : new Promise<void>((resolve) => {
                      const done = () => resolve();
                      img.addEventListener('load', done, { once: true });
                      img.addEventListener('error', done, { once: true });
                    })
            )
          );

          try {
            const canvas = await html2canvas(sourceModule, {
              backgroundColor: null,
              scale: 2,
              useCORS: true,
              logging: false,
              imageTimeout: 15000,
              width: Math.ceil(rect.width),
              height: Math.ceil(rect.height),
              scrollX: 0,
              scrollY: -previewDoc.defaultView!.scrollY,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const computed = previewDoc.defaultView?.getComputedStyle(sourceModule);
            const wrapper = doc.createElement('section');
            wrapper.setAttribute(
              'style',
              [
                'display:block',
                'width:100%',
                `max-width:${Math.ceil(rect.width)}px`,
                `margin-top:${computed?.marginTop || '0px'}`,
                `margin-right:${computed?.marginRight || 'auto'}`,
                `margin-bottom:${computed?.marginBottom || '0px'}`,
                `margin-left:${computed?.marginLeft || 'auto'}`,
                'padding:0',
                'line-height:0',
                'text-align:center',
                'box-sizing:border-box',
              ].join(';') + ';'
            );

            const image = doc.createElement('img');
            image.setAttribute('src', dataUrl);
            image.setAttribute('alt', sourceModule.textContent?.trim().slice(0, 80) || '公众号排版组件');
            image.setAttribute(
              'style',
              'display:block;width:100%;max-width:100%;height:auto;margin:0;padding:0;border:0;'
            );
            wrapper.appendChild(image);
            targetModule.replaceWith(wrapper);
          } catch (captureError) {
            console.warn('135 编辑器模块固化失败，保留兼容 HTML', captureError);
          }
        }
      }
    }

    const findFlexRow = (scope: Element) =>
      Array.from(scope.querySelectorAll<HTMLElement>('[style]')).find((el) => {
        const display = el.style.display.replace(/\s+/g, '').toLowerCase();
        return display === 'flex' && el.children.length >= 2;
      });

    // 135 editor title template 170950 uses flex plus three empty block nodes.
    // KindEditor expands those nodes to full-width rows, which creates the
    // three empty frames shown in the user's screenshot. A small table is
    // visually equivalent and is supported reliably by this older editor.
    root.querySelectorAll<HTMLElement>('[data-id="170950"]').forEach((block) => {
      const flex = findFlexRow(block);
      if (!flex) return;

      const children = Array.from(flex.children) as HTMLElement[];
      const dotColumn = children[0];
      const titleColumn = children[1];
      if (!dotColumn || !titleColumn) return;

      const titleBar = flex.parentElement as HTMLElement | null;
      if (titleBar) {
        // KindEditor may remove CSS gradients. Keep a solid fallback so the
        // white title and dots never become invisible on a white background.
        titleBar.style.backgroundColor = '#00c58b';
      }

      const table = doc.createElement('table');
      table.setAttribute(
        'style',
        'width:100%;border-collapse:collapse;border-spacing:0;table-layout:fixed;background:transparent;'
      );
      table.setAttribute('cellpadding', '0');
      table.setAttribute('cellspacing', '0');
      table.setAttribute('border', '0');

      const tr = doc.createElement('tr');
      const dotsTd = doc.createElement('td');
      const titleTd = doc.createElement('td');
      dotsTd.setAttribute('width', '18');
      dotsTd.setAttribute(
        'style',
        'width:18px;vertical-align:middle;padding:0 0 0 4px;border:0;background:transparent;'
      );
      titleTd.setAttribute(
        'style',
        'vertical-align:middle;padding:0;border:0;background:transparent;text-align:center;'
      );

      const dots = Array.from(dotColumn.children).slice(0, 3);
      dots.forEach((dot, index) => {
        const circle = doc.createElement('span');
        circle.innerHTML = '&nbsp;';
        circle.setAttribute(
          'style',
          `display:block;width:9px;height:9px;line-height:9px;overflow:hidden;border-radius:50%;background:#fff;${index ? 'margin-top:4px;' : ''}`
        );
        dotsTd.appendChild(circle);
      });

      while (titleColumn.firstChild) titleTd.appendChild(titleColumn.firstChild);
      tr.appendChild(dotsTd);
      tr.appendChild(titleTd);
      table.appendChild(tr);
      flex.replaceWith(table);
    });

    // The 135 image slider is not interactive inside KindEditor. Convert its
    // three cards to a fixed table so images remain visible after pasting.
    root.querySelectorAll<HTMLElement>('[data-id="99620"]').forEach((block) => {
      const flex = findFlexRow(block);
      if (!flex) return;
      const cards = Array.from(flex.children) as HTMLElement[];
      if (cards.length < 2) return;

      const table = doc.createElement('table');
      table.setAttribute(
        'style',
        'width:100%;border-collapse:collapse;border-spacing:0;table-layout:fixed;'
      );
      table.setAttribute('cellpadding', '0');
      table.setAttribute('cellspacing', '0');
      table.setAttribute('border', '0');
      const tr = doc.createElement('tr');

      cards.forEach((card) => {
        const td = doc.createElement('td');
        td.setAttribute(
          'style',
          'width:33.333%;vertical-align:top;padding:0 3px;border:0;background:transparent;'
        );
        while (card.firstChild) td.appendChild(card.firstChild);
        td.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
          img.style.width = '100%';
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
        });
        tr.appendChild(td);
      });
      table.appendChild(tr);
      flex.replaceWith(table);
    });

    // Remove editor-only metadata that adds size but has no visual effect.
    root.querySelectorAll<HTMLElement>('*').forEach((el) => {
      el.removeAttribute('leaf');
      el.removeAttribute('nodeleaf');
      el.removeAttribute('data-pm-slice');
      el.removeAttribute('data-aistatus');
      el.removeAttribute('data-imgfileid');
      el.removeAttribute('data-brushtype');
      if (el.tagName.toLowerCase() === 'img') {
        el.setAttribute('referrerpolicy', 'no-referrer');
      }
    });

    // Include the <style> blocks from the document head. DOMParser moves any
    // <style> tags from the body to the head while parsing, so returning only
    // root.innerHTML would silently drop all the WeChat CSS (font stack, colors,
    // spacing, etc.) and break 1:1 reproduction in editors like KindEditor.
    const styleTags = Array.from(doc.head.querySelectorAll('style'))
      .map(style => style.outerHTML)
      .join('\n');
    return styleTags + root.innerHTML;
  };

  const handleCopyCode = async () => {
    if (!article) return;
    try {
        let html = exportFormat === 'full' ? await buildKindEditorHtml() : buildCmsHtml();
        if (!html) html = buildCmsHtml();
        if (inlineImagesInExport) {
          html = await inlineImagesToDataUrl(html);
        }
        const sizeKb = Math.ceil(new Blob([html]).size / 1024);
        await navigator.clipboard.writeText(html);
        alert(`HTML 已复制！约 ${sizeKb} KB。请粘贴到 KindEditor 的“源代码”模式。`);
    } catch (err: any) {
        console.error('复制失败', err);
        alert(`复制失败: ${err.message || '未知错误'}`);
    }
  };

  const handleCopyPreviewCode = async () => {
    if (!article) return;
    try {
      await navigator.clipboard.writeText(previewContent);
      alert('HTML 已复制！(注意：包含代理图片链接，请确保工具运行中)');
    } catch (err) {
      console.error('复制失败', err);
    }
  };
  
  // Iframe content wrapper
  const IframePreview = ({
    content,
    styles,
    cssLinks,
    cssText,
    iframeRef,
  }: {
    content: string;
    styles?: string;
    cssLinks?: string[];
    cssText?: string;
    iframeRef: React.RefObject<HTMLIFrameElement | null>;
  }) => {
      useEffect(() => {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
              const doc = iframe.contentWindow.document;
              const origin = window.location.origin;
              const resize = () => {
                if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
                  iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
                }
              };
              doc.open();
              doc.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <base href="${origin}/">
                      <style>
                          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; }
                          /* 
                             FIX: Do NOT force height: auto !important; 
                             This breaks small icons/decorations that have specific height in style attribute.
                             Only limit max-width to prevent overflow.
                          */
                          img { max-width: 100%; }
                      </style>
                  </head>
                  <body>
                      ${content}
                  </body>
                  </html>
              `);
              doc.close();
              if (cssLinks && Array.isArray(cssLinks) && doc.head) {
                cssLinks.forEach((href) => {
                  if (!href) return;
                  const linkEl = doc.createElement('link');
                  linkEl.rel = 'stylesheet';
                  linkEl.href = href;
                  linkEl.addEventListener('load', resize, { once: true });
                  linkEl.addEventListener('error', resize, { once: true });
                  doc.head.appendChild(linkEl);
                });
              }
              if (styles && doc.head) {
                const styleEl = doc.createElement('style');
                styleEl.textContent = styles;
                doc.head.appendChild(styleEl);
              }
              if (cssText && doc.head) {
                const styleEl = doc.createElement('style');
                styleEl.textContent = cssText;
                doc.head.appendChild(styleEl);
              }
              if (doc.head) {
                const forceVisible = doc.createElement('style');
                forceVisible.textContent =
                  'html,body{visibility:visible!important;opacity:1!important;}#js_content,.rich_media_content{visibility:visible!important;opacity:1!important;display:block!important;}';
                doc.head.appendChild(forceVisible);
              }
              if (doc.documentElement) doc.documentElement.style.visibility = 'visible';
              if (doc.body) doc.body.style.visibility = 'visible';
              
              // Auto resize height
              const resizeObserver = new ResizeObserver(() => {
                  resize();
              });
              if (doc.body) {
                  resizeObserver.observe(doc.body);
              }
              const imageNodes = Array.from(doc.images || []);
              imageNodes.forEach((img) => {
                img.addEventListener('load', resize);
                img.addEventListener('error', () => {
                  const current = img.getAttribute('src') || '';
                  const retry = parseInt(img.getAttribute('data-retry') || '0', 10);
                  if (current.includes('/api/proxy-image') && retry < 3) {
                    img.setAttribute('data-retry', String(retry + 1));
                    const separator = current.includes('?') ? '&' : '?';
                    img.setAttribute('src', `${current}${separator}_retry=${retry + 1}&_ts=${Date.now()}`);
                    resize();
                    return;
                  }
                  const fallback = img.getAttribute('data-fallback-src');
                  if (fallback && fallback !== current) {
                    img.setAttribute('src', fallback);
                  }
                  resize();
                });
              });
              resize();
              const t1 = window.setTimeout(resize, 300);
              const t2 = window.setTimeout(resize, 1200);
              const t3 = window.setTimeout(resize, 3000);
              return () => {
                resizeObserver.disconnect();
                window.clearTimeout(t1);
                window.clearTimeout(t2);
                window.clearTimeout(t3);
              };
          }
      }, [content, styles, cssLinks, cssText]);

      return <iframe ref={iframeRef} className="w-full border-0" title="预览" />;
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
           <RefreshCw className="w-6 h-6 text-blue-600" />
           <h1 className="text-xl font-bold text-gray-800">H5 高保真排版助手</h1>
        </div>
        <div className="text-sm text-gray-500">微信文章转 CMS 工具</div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Configuration */}
        <aside className="w-80 bg-white border-r flex flex-col p-4 overflow-y-auto shrink-0">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">微信文章链接</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mp.weixin.qq.com/s/..."
                  className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={fetchArticle}
                disabled={loading || !url}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                获取文章
              </button>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>

            {article && (
               <div className="space-y-4 pt-4 border-t">
                 <h3 className="font-medium text-gray-900">后台配置</h3>
                 
                 <div className="space-y-2">
                    <label className="text-sm text-gray-600">标题</label>
                    <input 
                        type="text" 
                        value={article.title} 
                        readOnly
                        className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm text-gray-600">分类</label>
                    <select 
                        value={config.category}
                        onChange={(e) => setConfig({...config, category: e.target.value})}
                        className="w-full border rounded px-3 py-2 text-sm"
                    >
                        <option value="">选择分类...</option>
                        <option value="news">企业要闻</option>
                        <option value="media">媒体聚焦</option>
                        <option value="industry">行业动态</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm text-gray-600">选项</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={config.showFrontend}
                                onChange={(e) => setConfig({...config, showFrontend: e.target.checked})}
                                className="rounded text-blue-600"
                            />
                            前台显示
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={config.recommendHome}
                                onChange={(e) => setConfig({...config, recommendHome: e.target.checked})}
                                className="rounded text-blue-600"
                            />
                            推荐首页
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={config.focusNews}
                                onChange={(e) => setConfig({...config, focusNews: e.target.checked})}
                                className="rounded text-blue-600"
                            />
                            焦点新闻
                        </label>
                    </div>
                 </div>
               </div>
            )}
          </div>
        </aside>

        {/* Middle: Preview Area */}
        <section className="flex-1 bg-gray-100 flex flex-col overflow-hidden relative">
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('preview')}
                        className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition", activeTab === 'preview' ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:text-gray-700")}
                    >
                        预览
                    </button>
                    <button 
                        onClick={() => setActiveTab('source')}
                        className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition", activeTab === 'source' ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:text-gray-700")}
                    >
                        源代码
                    </button>
                </div>
                <div className="text-xs text-gray-500">
                    高保真模式 (样式隔离)
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                {previewContent ? (
                    <div className="w-[800px] bg-white shadow-lg min-h-[1000px] rounded-sm overflow-visible flex flex-col">
                        {activeTab === 'preview' ? (
                            <div className="p-0 flex-1 relative">
                                <IframePreview
                                  content={previewContent}
                                  styles={previewStyles}
                                  cssLinks={previewCssLinks}
                                  cssText={previewCssText}
                                  iframeRef={previewIframeRef}
                                />
                            </div>
                        ) : (
                            <pre className="p-4 text-xs overflow-auto h-full bg-gray-50 text-gray-700 font-mono whitespace-pre-wrap">
                                {previewContent}
                            </pre>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>请输入文章链接以预览内容</p>
                    </div>
                )}
            </div>
        </section>

        {/* Right Sidebar: Assets & Actions */}
        <aside className="w-80 bg-white border-l flex flex-col p-4 overflow-y-auto shrink-0">
           {article ? (
               <div className="space-y-6">
                   <div className="space-y-2">
                       <h3 className="font-medium text-gray-900 flex items-center gap-2">
                           <Scissors className="w-4 h-4" /> 封面图片
                       </h3>
                       <p className="text-xs text-gray-500">裁剪为 526x350 (必填)</p>
                       
                       {/* If we have a cropped image, show it, otherwise show cropper */}
                       {croppedCover ? (
                           <div className="space-y-2">
                               <img src={croppedCover} alt="Cropped Cover" className="w-full rounded border" />
                               <button 
                                   onClick={() => setCroppedCover('')}
                                   className="text-xs text-blue-600 hover:underline"
                               >
                                   重新裁剪
                               </button>
                           </div>
                       ) : (
                           article.cover ? (
                               // We need to proxy the cover image too for the cropper to avoid CORS
                               <ImageCropper 
                                    imageSrc={article.cover.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(article.cover)}&ref=${encodeURIComponent(url)}` : article.cover} 
                                    onCropComplete={setCroppedCover} 
                               />
                           ) : (
                               <div className="text-sm text-red-500">未找到封面图片</div>
                           )
                       )}
                   </div>

                   <div className="pt-6 border-t space-y-4">
                       <h3 className="font-medium text-gray-900">导出</h3>
                       <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                           <strong className="flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3"/> KindEditor 提示:</strong>
                           官网后台使用 KindEditor。粘贴前请先点击后台编辑器的 [源代码] 按钮。保真模式会保留公众号结构，并把 135 编辑器中不兼容的标题栏和图片滑块转成稳定布局。
                           <div className="mt-2 flex items-center gap-2">
                               <input 
                                   type="checkbox" 
                                   id="useProxy"
                                   checked={useProxyInExport}
                                   onChange={(e) => setUseProxyInExport(e.target.checked)}
                                   className="rounded text-green-600 focus:ring-green-500"
                               />
                               <label htmlFor="useProxy" className="cursor-pointer select-none">
                                   使用本地代理图片 (仅预览/临时排查)
                               </label>
                           </div>
                           <div className="mt-2 flex items-center gap-2">
                               <input
                                   type="checkbox"
                                   id="inlineImages"
                                   checked={inlineImagesInExport}
                                   onChange={(e) => setInlineImagesInExport(e.target.checked)}
                                   className="rounded text-green-600 focus:ring-green-500"
                               />
                               <label htmlFor="inlineImages" className="cursor-pointer select-none">
                                   图片内嵌 Base64（默认开启，避免图片丢失）
                               </label>
                           </div>
                           <div className="mt-2 space-y-1">
                               <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                   <input
                                       type="radio"
                                       name="exportFormat"
                                       value="kindeditor"
                                       checked={exportFormat === 'kindeditor'}
                                       onChange={() => setExportFormat('kindeditor')}
                                   />
                                   简单模式（原始结构，排版兼容性一般）
                               </label>
                               <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                   <input
                                       type="radio"
                                       name="exportFormat"
                                       value="full"
                                       checked={exportFormat === 'full'}
                                       onChange={() => setExportFormat('full')}
                                   />
                                   KindEditor 保真模式（推荐）
                               </label>
                           </div>
                           {useProxyInExport && (
                               <p className="mt-1 text-yellow-700 opacity-80">
                                   注意: 导出含本地编辑器链接，官网不会自动长期保存这些图片。
                               </p>
                           )}
                           {!inlineImagesInExport && !useProxyInExport && (
                               <p className="mt-1 text-red-700">
                                   当前会导出微信原图地址，建议保存后检查图片；如后台支持转存可再手动处理。
                               </p>
                           )}
                           {inlineImagesInExport && (
                               <p className="mt-1 text-yellow-700 opacity-80">
                                   图片会随 HTML 一起保存，不再依赖微信原图地址；复制过程可能需要等待几秒。
                               </p>
                           )}
                       </div>
                       
                       <button 
                            onClick={handleCopyCode}
                            className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 shadow-sm transition flex items-center justify-center gap-2 font-medium"
                       >
                           <Copy className="w-4 h-4" />
                           复制官网后台 HTML
                       </button>

                       <button 
                            onClick={handleCopyPreviewCode}
                            className="w-full bg-white text-gray-800 py-3 rounded-md hover:bg-gray-50 border shadow-sm transition flex items-center justify-center gap-2 font-medium"
                       >
                           <Copy className="w-4 h-4" />
                           复制预览 HTML(含代理图片)
                       </button>
                   </div>
               </div>
           ) : (
               <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                   <p className="text-sm text-center">请先加载文章以管理素材</p>
               </div>
           )}
        </aside>
      </div>
    </main>
  );
}
