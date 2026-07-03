'use client';

import { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Clipboard,
  Code2,
  Copy,
  FileText,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Info,
  LayoutTemplate,
  Link as LinkIcon,
  List,
  Monitor,
  PenLine,
  Quote,
  RefreshCw,
  Save,
  Scissors,
  Send,
  Settings2,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Type,
  Palette,
  Link2,
  ArrowUp,
  ArrowDown,
  Copy as CopyIcon,
  Smartphone,
  Sparkles,
  ImagePlus,
  MoveHorizontal,
  MoveVertical,
  Trash2,
  Upload,
  Bot,
  Wand2,
  KeyRound,
} from 'lucide-react';
import ImageCropper from '@/components/ImageCropper';
import { cn } from '@/lib/utils';
import {
  type SelectionInfo,
  applyActiveModuleStyle,
  applyTextColor,
  applyTextStyle,
  applyFontFamily,
  applyFontSize,
  applyBlockAlign,
  applyFormat,
  detectSelection,
  duplicateBlock,
  duplicateActiveModule,
  insertBlankAroundActiveModule,
  insertLink,
  isImageElement,
  moveBlock,
  moveActiveModule,
  readFileAsDataUrl,
  removeBlock,
  removeActiveModule,
  replaceImage,
  selectMediaInActiveBlock,
  applyImageStyle,
  setBlockActive,
  setModuleActive,
} from '@/lib/wechatEditor';
import {
  type ImportedWechatModule,
  extractWechatModulesFromHtml,
  sanitizeImportedHtml,
  moduleKindLabel,
  wechatModuleStore,
} from '@/lib/wechatModules';

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
  const [wechatArticleUrl, setWechatArticleUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [wechatImporting, setWechatImporting] = useState(false);
  const [wechatImportPanelOpen, setWechatImportPanelOpen] = useState(false);
  const [error, setError] = useState('');
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [croppedCover, setCroppedCover] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [previewStyles, setPreviewStyles] = useState('');
  const [previewCssLinks, setPreviewCssLinks] = useState<string[]>([]);
  const [previewCssText, setPreviewCssText] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
  const [workspaceMode, setWorkspaceMode] = useState<'repost' | 'wechat'>('repost');
  const [manualTitle, setManualTitle] = useState('打造高质量内容运营的 3 个关键步骤');
  const [manualAuthor, setManualAuthor] = useState('内容运营研究社');
  const [manualSummary, setManualSummary] = useState('从定位、选题、执行到复盘，系统化提升内容质量与传播效果。');
  const [manualContent, setManualContent] = useState(
    '<h2>明确定位，找准目标用户</h2><p>清晰的定位是内容运营的起点。只有明确目标用户的需求、痛点与兴趣点，才能创作出真正打动他们的内容。</p><blockquote>定位不是自我设定，而是用户认知的结果。</blockquote><h2>精心选题，提供价值</h2><p>好选题决定了内容的打开率和传播潜力。建议从用户需求、热点趋势、行业洞察等多个维度挖掘选题灵感。</p>'
  );
  const [importedHtml, setImportedHtml] = useState('');
  const [importedModules, setImportedModules] = useState<ImportedWechatModule[]>([]);
  const [savedModules, setSavedModules] = useState<ImportedWechatModule[]>([]);
  const [importNotice, setImportNotice] = useState('');
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const fallbackFonts = [
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    'Songti SC',
    'SimSun',
    'STHeiti',
    'Heiti SC',
    'Kaiti SC',
    'KaiTi',
    'Arial',
    'Georgia',
    'Times New Roman',
  ];
  const [availableFonts, setAvailableFonts] = useState<string[]>(fallbackFonts);
  const [activeFontFamily, setActiveFontFamily] = useState('PingFang SC');
  const [activeFontSize, setActiveFontSize] = useState(16);
  const [activeColor, setActiveColor] = useState('#0f172a');
  const [activeImageSize, setActiveImageSize] = useState('100%');
  const [activeImageRadius, setActiveImageRadius] = useState(0);
  const [moduleWidth, setModuleWidth] = useState(100);
  const [modulePadding, setModulePadding] = useState(0);
  const [moduleMargin, setModuleMargin] = useState(16);
  const [moduleBorderWidth, setModuleBorderWidth] = useState(0);
  const [moduleRadius, setModuleRadius] = useState(0);
  const [moduleShadow, setModuleShadow] = useState(false);
  const [applySimilarStyles, setApplySimilarStyles] = useState(false);
  const [useProxyInExport, setUseProxyInExport] = useState(false);
  const [inlineImagesInExport, setInlineImagesInExport] = useState(true);
  const [exportFormat, setExportFormat] = useState<'kindeditor' | 'full'>('full');
  const [assistantTask, setAssistantTask] = useState<'polish' | 'titles' | 'digest' | 'humanize' | 'audit'>('polish');
  const [assistantBaseUrl, setAssistantBaseUrl] = useState('https://api.openai.com/v1');
  const [assistantModel, setAssistantModel] = useState('gpt-4.1-mini');
  const [assistantApiKey, setAssistantApiKey] = useState('');
  const [assistantResult, setAssistantResult] = useState('');
  const [assistantNotice, setAssistantNotice] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const manualEditorRef = useRef<HTMLDivElement>(null);
  const lastSyncedContent = useRef<string>(manualContent);
  const isSyncing = useRef(false);
  const draftRestoredRef = useRef(false);
  const manualHistoryRef = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const lastInputHistoryAt = useRef(0);
  const [canUndoManual, setCanUndoManual] = useState(false);
  const [canRedoManual, setCanRedoManual] = useState(false);
  const fetchArticleControllerRef = useRef<AbortController | null>(null);
  const manualDraftKey = 'contentcraft:wechat-editor-draft:v1';
  const manualDraftDbName = 'BianjiqiWechatEditorDraft';
  const manualDraftStore = 'drafts';
  const styleColors = ['#fde8c8', '#f8c981', '#991b1b', '#dc2626', '#b91c1c', '#ffffff', '#4b5563', '#f5efe6', '#111827', '#f97316', '#facc15', '#16a34a', '#2563eb', '#8b5cf6', '#ec4899', '#0f766e'];
  const gradientColors = ['linear-gradient(135deg,#fda4af,#818cf8)', 'linear-gradient(135deg,#fef3c7,#fb7185)', 'linear-gradient(135deg,#93c5fd,#14b8a6)', 'linear-gradient(135deg,#f9a8d4,#c084fc)'];

  type ManualDraft = {
    title: string;
    author: string;
    summary: string;
    content: string;
    updatedAt: string;
  };

  const openManualDraftDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(manualDraftDbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(manualDraftStore)) {
          db.createObjectStore(manualDraftStore);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const readManualDraft = async () => {
    const db = await openManualDraftDb();
    return new Promise<ManualDraft | null>((resolve, reject) => {
      const tx = db.transaction(manualDraftStore, 'readonly');
      const request = tx.objectStore(manualDraftStore).get('current');
      request.onsuccess = () => resolve((request.result as ManualDraft | undefined) || null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  };

  const saveManualDraft = async (draft: ManualDraft) => {
    const db = await openManualDraftDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(manualDraftStore, 'readwrite');
      tx.objectStore(manualDraftStore).put(draft, 'current');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  };

  const updateManualHistoryState = () => {
    setCanUndoManual(manualHistoryRef.current.past.length > 0);
    setCanRedoManual(manualHistoryRef.current.future.length > 0);
  };

  const pushManualHistory = (snapshot: string) => {
    if (!snapshot) return;
    const history = manualHistoryRef.current;
    const last = history.past[history.past.length - 1];
    if (last === snapshot) return;
    history.past = [...history.past.slice(-59), snapshot];
    history.future = [];
    updateManualHistoryState();
  };

  const commitManualContent = (next: string, historySnapshot?: string) => {
    if (historySnapshot && historySnapshot !== next) pushManualHistory(historySnapshot);
    lastSyncedContent.current = next;
    setManualContent(next);
  };

  const commitManualEditorDom = (historySnapshot?: string) => {
    const editor = manualEditorRef.current;
    if (!editor) return;
    commitManualContent(editor.innerHTML, historySnapshot);
  };

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

  useEffect(() => {
    wechatModuleStore
      .all()
      .then(setSavedModules)
      .catch(() => setSavedModules([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLocalFonts = async () => {
      try {
        const queryLocalFonts = (window as any).queryLocalFonts;
        if (typeof queryLocalFonts !== 'function') return;
        const fonts = await queryLocalFonts();
        const names = Array.from<string>(
          new Set(
            fonts
              .map((font: { family?: string; fullName?: string }) => font.family || font.fullName)
              .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        if (!cancelled && names.length) {
          setAvailableFonts(Array.from(new Set([...fallbackFonts, ...names])));
        }
      } catch {
        // Browser may require permission or not support local font access.
      }
    };
    loadLocalFonts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restoreDraft = async () => {
      try {
        let draft = await readManualDraft();
        const legacyRaw = window.localStorage.getItem(manualDraftKey);
        if (!draft && legacyRaw) {
          draft = JSON.parse(legacyRaw) as ManualDraft;
        }
        window.localStorage.removeItem(manualDraftKey);
        if (!cancelled && draft) {
          if (typeof draft.title === 'string') setManualTitle(draft.title);
          if (typeof draft.author === 'string') setManualAuthor(draft.author);
          if (typeof draft.summary === 'string') setManualSummary(draft.summary);
          if (typeof draft.content === 'string' && draft.content.trim()) {
            lastSyncedContent.current = draft.content;
            setManualContent(draft.content);
          }
        }
      } catch {
        // Ignore broken local drafts so the editor can still open.
      } finally {
        if (!cancelled) draftRestoredRef.current = true;
      }
    };
    restoreDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftRestoredRef.current) return;
    const timer = window.setTimeout(() => {
      saveManualDraft({
          title: manualTitle,
          author: manualAuthor,
          summary: manualSummary,
          content: manualContent,
          updatedAt: new Date().toISOString(),
        })
        .catch(() => {
          setImportNotice('草稿内容过大，自动保存失败。请压缩图片或减少超大动图后再继续编辑。');
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [manualTitle, manualAuthor, manualSummary, manualContent]);

  useEffect(() => {
    const onUp = (event: Event) => {
      const root = manualEditorRef.current;
      if (!root) return;
      const target = event.target as HTMLElement | null;
      if (!target || !root.contains(target)) return;
      refreshSelection(target);
    };
    document.addEventListener('click', onUp, true);
    document.addEventListener('keyup', onUp, true);
    document.addEventListener('mouseup', onUp, true);
    return () => {
      document.removeEventListener('click', onUp, true);
      document.removeEventListener('keyup', onUp, true);
      document.removeEventListener('mouseup', onUp, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBlockActive(manualEditorRef.current, selectionInfo ? selectionInfo.element : null);
    setModuleActive(manualEditorRef.current, selectionInfo ? selectionInfo.element : null);
  }, [selectionInfo]);

  useEffect(() => {
    const root = manualEditorRef.current;
    if (!root) return;
    if (lastSyncedContent.current === manualContent && root.innerHTML === manualContent) return;
    isSyncing.current = true;
    root.innerHTML = manualContent;
    lastSyncedContent.current = manualContent;
    queueMicrotask(() => { isSyncing.current = false; });
  }, [manualContent, workspaceMode]);

  useEffect(() => {
    if (!selectionInfo) {
      setBlockActive(manualEditorRef.current, null);
      setModuleActive(manualEditorRef.current, null);
      return;
    }
    const root = manualEditorRef.current;
    if (!root) return;
    setBlockActive(root, selectionInfo.element);
    setModuleActive(root, selectionInfo.element);
  }, [selectionInfo]);

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

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const optimizeReplacementImageFile = async (file: File) => {
    const type = file.type || '';
    if (type === 'image/svg+xml') {
      setImportNotice(`已识别 SVG 图片，保留原始矢量格式：${formatBytes(file.size)}。`);
      return file;
    }
    if (type === 'image/gif') {
      setImportNotice(
        file.size > 2 * 1024 * 1024
          ? `已识别较大 GIF：${formatBytes(file.size)}。为保留动图，不会转码；草稿将使用 IndexedDB 保存。`
          : `已识别 GIF 动图，保留动画：${formatBytes(file.size)}。`
      );
      return file;
    }
    if (!type.startsWith('image/') || typeof document === 'undefined') return file;
    if (file.size <= 600 * 1024) {
      setImportNotice(`图片大小 ${formatBytes(file.size)}，无需压缩。`);
      return file;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      image.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('图片解码失败'));
        image.src = objectUrl;
      });

      const maxWidth = 1080;
      const scale = Math.min(1, maxWidth / Math.max(1, image.naturalWidth));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      const qualities = [0.82, 0.72, 0.62];
      let best: Blob | null = null;
      for (const quality of qualities) {
        const compressed = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', quality);
        });
        if (compressed) best = compressed;
        if (compressed && compressed.size <= 700 * 1024) break;
      }

      if (!best || best.size >= file.size) {
        setImportNotice(`图片 ${formatBytes(file.size)} 已检测，但压缩收益不明显，保留原图。`);
        return file;
      }
      setImportNotice(
        `图片已自动压缩：${formatBytes(file.size)} -> ${formatBytes(best.size)}，尺寸 ${image.naturalWidth}x${image.naturalHeight} -> ${width}x${height}。`
      );
      return new File([best], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    } catch {
      setImportNotice(`图片大小 ${formatBytes(file.size)}，但无法自动压缩，已保留原图。`);
      return file;
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
        alert(`HTML 已复制！约 ${sizeKb} KB。可粘贴到微信公众号编辑器、135 类编辑器或后台 HTML/源代码模式。`);
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

  const manualTemplates = [
    {
      id: 'title',
      label: '标题块',
      icon: Heading2,
      html:
        '<section style="margin:24px 0 16px;padding:0 0 0 14px;border-left:4px solid #2563eb;"><h2 style="margin:0;color:#111827;font-size:20px;line-height:1.45;font-weight:700;">这里输入小标题</h2></section>',
    },
    {
      id: 'quote',
      label: '引用',
      icon: Quote,
      html:
        '<blockquote style="margin:20px 0;padding:16px 18px;background:#f8fafc;border-left:4px solid #10b981;color:#475569;font-size:15px;line-height:1.8;">这里输入金句、观点或摘要。</blockquote>',
    },
    {
      id: 'list',
      label: '要点',
      icon: List,
      html:
        '<ul style="margin:16px 0;padding-left:22px;color:#1f2937;font-size:16px;line-height:1.9;"><li>第一个要点</li><li>第二个要点</li><li>第三个要点</li></ul>',
    },
    {
      id: 'image',
      label: '图片位',
      icon: ImageIcon,
      html:
        '<section style="margin:22px 0;text-align:center;"><div style="padding:40px 16px;border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b;font-size:14px;">在公众号后台替换为图片</div><p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">图片说明</p></section>',
    },
  ];

  const buildManualWechatHtml = () => {
    const title = manualTitle.trim() || '未命名文章';
    const author = manualAuthor.trim();
    const summary = manualSummary.trim();
    return `
      <section style="max-width:677px;margin:0 auto;padding:24px 18px;background:#ffffff;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif;box-sizing:border-box;">
        <h1 style="margin:0 0 10px;color:#111827;font-size:24px;line-height:1.35;font-weight:800;">${title}</h1>
        ${author ? `<p style="margin:0 0 18px;color:#64748b;font-size:13px;line-height:1.6;">${author}</p>` : ''}
        ${summary ? `<section style="margin:16px 0 24px;padding:14px 16px;background:#f8fafc;border-radius:8px;color:#475569;font-size:15px;line-height:1.8;">${summary}</section>` : ''}
        <section style="font-size:16px;line-height:1.9;letter-spacing:.2px;">${manualContent}</section>
      </section>
    `.trim();
  };

  const wrapManualModuleHtml = (html: string) => {
    const trimmed = html.trim();
    if (!trimmed) return '';
    const escapedLabel = trimmed.replace(/<[^>]*>/g, '').trim().slice(0, 24) || '公众号模块';
    return `<section data-contentcraft-module="true" data-module-label="${escapedLabel}" style="margin:16px 0;">${trimmed}</section>`;
  };

  const insertManualTemplate = (html: string) => {
    setWorkspaceMode('wechat');
    const moduleHtml = wrapManualModuleHtml(html);
    if (!moduleHtml) return;
    const editor = manualEditorRef.current;
    if (!editor) {
      commitManualContent(`${manualContent}${moduleHtml}`, manualContent);
      return;
    }
    const before = editor.innerHTML;
    editor.focus();
    document.execCommand('insertHTML', false, moduleHtml);
    commitManualEditorDom(before);
  };

  const extractWechatModules = (html: string, sourceLabel = '导入素材') => {
    const modules = extractWechatModulesFromHtml(html, sourceLabel);
    if (!modules.length) {
      setImportedModules([]);
      setImportNotice('没有识别到可导入的 HTML。');
      return;
    }
    setImportedModules(modules);
    setImportNotice(`已提取 ${modules.length} 个可复用模块。`);
  };

  const saveModuleToLibrary = async (module: ImportedWechatModule) => {
    const saved = {
      ...module,
      id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: module.label.replace(/^导入/, '收藏'),
      createdAt: Date.now(),
    };
    await wechatModuleStore.put(saved);
    setSavedModules((current) => {
      if (current.some((item) => item.html === module.html)) return current;
      return [saved, ...current].slice(0, 80);
    });
    setImportNotice('已保存到本地公众号素材库。');
  };

  const saveAllImportedModules = async () => {
    if (!importedModules.length) {
      setImportNotice('当前没有可保存的导入模块。');
      return;
    }
    const savedBatch = importedModules.map((module) => ({
      ...module,
      id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    }));
    await Promise.all(savedBatch.map((module) => wechatModuleStore.put(module)));
    setSavedModules((current) => {
      const next = [...current];
      savedBatch.forEach((module) => {
        if (!next.some((item) => item.html === module.html)) {
          next.unshift(module);
        }
      });
      return next.slice(0, 80);
    });
    setImportNotice(`已保存 ${importedModules.length} 个模块到本地素材库。`);
  };

  const deleteSavedModule = async (id: string) => {
    await wechatModuleStore.remove(id);
    setSavedModules((current) => current.filter((item) => item.id !== id));
  };

  const handleExtractImportedHtml = () => {
    extractWechatModules(importedHtml, '粘贴');
  };

  const handleExtractFromCurrentArticle = () => {
    const html = previewContent || article?.content || '';
    if (!html) {
      setImportNotice('请先在“转载文章”中导入一篇公众号文章，或直接粘贴 HTML。');
      return;
    }
    extractWechatModules(html, '当前文章');
    setWorkspaceMode('wechat');
  };

  const writeArticleToWechatEditor = (
    sourceHtml: string,
    mode: 'replace' | 'append',
    meta?: { title?: string; desc?: string }
  ) => {
    const cleaned = sanitizeImportedHtml(sourceHtml);
    if (!cleaned) {
      setImportNotice('当前文章没有可导入的正文。');
      return false;
    }
    setWorkspaceMode('wechat');
    const before = manualEditorRef.current?.innerHTML || manualContent;
    setManualTitle(meta?.title || manualTitle);
    setManualAuthor(meta?.desc ? meta.desc.slice(0, 40) : manualAuthor);
    const nextContent = mode === 'replace' ? cleaned : `${before}${cleaned}`;
    if (mode === 'replace') {
      commitManualContent(cleaned, before);
    } else {
      commitManualContent(nextContent, before);
    }
    const editor = manualEditorRef.current;
    if (editor) {
      editor.innerHTML = nextContent;
    }
    setImportNotice(mode === 'replace' ? '已用当前文章替换公众号正文。' : '已在公众号正文末尾追加当前文章。');
    return true;
  };

  const handleImportArticleToWechat = (mode: 'replace' | 'append') => {
    const sourceHtml = previewContent || article?.content || '';
    if (!sourceHtml) {
      setImportNotice('请先在“转载文章”中导入一篇公众号文章。');
      return;
    }
    writeArticleToWechatEditor(sourceHtml, mode, { title: article?.title, desc: article?.desc });
  };

  const handleFetchArticleIntoWechat = async (mode: 'replace' | 'append') => {
    const cleanedUrl = normalizeArticleUrl(wechatArticleUrl);
    if (!cleanedUrl) {
      setImportNotice('请输入有效的微信公众号文章链接。');
      return;
    }
    setWechatArticleUrl(cleanedUrl);
    setWechatImporting(true);
    setImportNotice('正在导入公众号文章...');
    try {
      const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(cleanedUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取文章失败');
      if (!data?.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('未解析到正文内容：可能是链接无效、文章已删除，或需要验证');
      }

      const processedContent = processContentForPreview(data.content, cleanedUrl);
      const ok = writeArticleToWechatEditor(processedContent, mode, {
        title: data.title,
        desc: data.desc,
      });
      if (ok) {
        setArticle(data);
        setPreviewStyles(data.styles || '');
        setPreviewCssLinks(Array.isArray(data.cssLinks) ? data.cssLinks : []);
        setPreviewContent(processedContent);
        setImportNotice(mode === 'replace' ? '公众号文章已导入并替换正文。' : '公众号文章已追加到正文末尾。');
      }
    } catch (err: any) {
      setImportNotice(err?.message || '导入公众号文章失败。');
    } finally {
      setWechatImporting(false);
    }
  };

  const handleImportDocumentFile = async (file: File) => {
    setWechatImporting(true);
    setImportNotice(`正在解析 ${file.name}...`);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/import-file', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '文件解析失败');
      if (!data?.html) throw new Error('文件没有解析到可导入内容。');

      const mode = manualContent.trim() ? 'append' : 'replace';
      const ok = writeArticleToWechatEditor(data.html, mode, {
        title: data.title,
        desc: `${data.type || '文件'}导入`,
      });
      if (ok) setImportNotice(`${file.name} 已解析并${mode === 'append' ? '追加到' : '导入'}公众号正文。`);
    } catch (err: any) {
      setImportNotice(err?.message || '文件解析失败。');
    } finally {
      setWechatImporting(false);
    }
  };

  const handlePickDocumentFile = (kind: 'word' | 'excel' | 'pdf' | 'ppt') => {
    if (typeof document === 'undefined') return;
    const acceptMap = {
      word: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      excel: '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
      pdf: '.pdf,application/pdf',
      ppt: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptMap[kind];
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) handleImportDocumentFile(file);
    });
    input.click();
  };

  const applyManualCommand = (command: 'bold' | 'insertUnorderedList' | 'formatBlock', value?: string) => {
    setWorkspaceMode('wechat');
    const before = manualEditorRef.current?.innerHTML;
    manualEditorRef.current?.focus();
    document.execCommand(command, false, value);
    commitManualEditorDom(before);
  };

  const refreshSelection = (eventTarget: Element | null = null) => {
    const info = detectSelection(manualEditorRef.current, eventTarget);
    if (info) {
      setBlockActive(manualEditorRef.current, info.element);
      setModuleActive(manualEditorRef.current, info.element);
      setSelectionInfo(info);
    } else {
      setBlockActive(manualEditorRef.current, null);
      setModuleActive(manualEditorRef.current, null);
      setSelectionInfo(null);
    }
  };

  const handleStyleCommand = (command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    const before = manualEditorRef.current?.innerHTML;
    applyTextStyle(manualEditorRef.current, command);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleApplyFormat = (tag: 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'p') => {
    const before = manualEditorRef.current?.innerHTML;
    applyFormat(manualEditorRef.current, tag);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleApplyAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    const before = manualEditorRef.current?.innerHTML;
    applyBlockAlign(manualEditorRef.current, align);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleFontSize = (size: number) => {
    setActiveFontSize(size);
    const before = manualEditorRef.current?.innerHTML;
    applyFontSize(manualEditorRef.current, size);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleFontFamily = (family: string) => {
    setActiveFontFamily(family);
    const before = manualEditorRef.current?.innerHTML;
    applyFontFamily(manualEditorRef.current, family);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleColor = (color: string) => {
    setActiveColor(color);
    const before = manualEditorRef.current?.innerHTML;
    applyTextColor(manualEditorRef.current, color);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleInsertLink = () => {
    const before = manualEditorRef.current?.innerHTML;
    insertLink(manualEditorRef.current);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleBlockAction = (action: 'up' | 'down' | 'duplicate' | 'remove') => {
    if (!manualEditorRef.current) return;
    const before = manualEditorRef.current.innerHTML;
    if (action === 'up' || action === 'down') moveBlock(manualEditorRef.current, action);
    if (action === 'duplicate') duplicateBlock(manualEditorRef.current);
    if (action === 'remove') removeBlock(manualEditorRef.current);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleModuleAction = (action: 'up' | 'down' | 'duplicate' | 'remove' | 'blankBefore' | 'blankAfter') => {
    if (!manualEditorRef.current) return;
    const before = manualEditorRef.current.innerHTML;
    if (action === 'up' || action === 'down') moveActiveModule(manualEditorRef.current, action);
    if (action === 'duplicate') duplicateActiveModule(manualEditorRef.current);
    if (action === 'remove') removeActiveModule(manualEditorRef.current);
    if (action === 'blankBefore') insertBlankAroundActiveModule(manualEditorRef.current, 'before');
    if (action === 'blankAfter') insertBlankAroundActiveModule(manualEditorRef.current, 'after');
    commitManualEditorDom(before);
    refreshSelection(selectionInfo?.element || null);
  };

  const handleModuleStyle = (patch: Parameters<typeof applyActiveModuleStyle>[1]) => {
    if (!manualEditorRef.current) return;
    const before = manualEditorRef.current.innerHTML;
    applyActiveModuleStyle(manualEditorRef.current, { ...patch, applySimilar: applySimilarStyles });
    commitManualEditorDom(before);
    refreshSelection(selectionInfo?.element || null);
  };

  const handleModuleWidth = (value: number) => {
    setModuleWidth(value);
    handleModuleStyle({ widthPercent: value });
  };

  const handleModulePadding = (value: number) => {
    setModulePadding(value);
    handleModuleStyle({ padding: value });
  };

  const handleModuleMargin = (value: number) => {
    setModuleMargin(value);
    handleModuleStyle({ margin: value });
  };

  const handleModuleBorderWidth = (value: number) => {
    setModuleBorderWidth(value);
    handleModuleStyle({ borderWidth: value });
  };

  const handleModuleRadius = (value: number) => {
    setModuleRadius(value);
    handleModuleStyle({ borderRadius: value });
  };

  const handleModuleShadow = () => {
    const next = !moduleShadow;
    setModuleShadow(next);
    handleModuleStyle({ shadow: next });
  };

  const handleSaveActiveModule = async () => {
    const moduleEl = selectionInfo?.moduleElement;
    if (!moduleEl) {
      setImportNotice('请先选中一个模块。');
      return;
    }
    const saved: ImportedWechatModule = {
      id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: moduleEl.getAttribute('data-module-label') || '当前编辑模块',
      kind: moduleEl.querySelector('svg') || moduleEl.tagName.toLowerCase() === 'svg' ? 'svg' : moduleEl.querySelector('img') ? 'image' : 'layout',
      html: moduleEl.outerHTML,
      previewText: moduleEl.textContent?.trim().slice(0, 80) || '编辑器保存模块',
      createdAt: Date.now(),
    };
    await wechatModuleStore.put(saved);
    setSavedModules((current) => [saved, ...current].slice(0, 80));
    setImportNotice('已保存当前模块到本地素材库。');
  };

  const handleCopyActiveModuleHtml = async () => {
    const moduleEl = selectionInfo?.moduleElement;
    if (!moduleEl) return;
    await navigator.clipboard.writeText(moduleEl.outerHTML);
    setImportNotice('当前模块 HTML 已复制。');
  };

  const handleClearManualContent = () => {
    if (!window.confirm('确定清空当前公众号正文吗？此操作可以用撤回恢复。')) return;
    const before = manualEditorRef.current?.innerHTML || manualContent;
    if (manualEditorRef.current) manualEditorRef.current.innerHTML = '';
    commitManualContent('', before);
    refreshSelection();
    setImportNotice('已清空公众号正文，可用撤回恢复。');
  };

  const handleQuickSave = async () => {
    if (selectionInfo?.moduleElement) {
      await handleSaveActiveModule();
      return;
    }
    await saveManualDraft({
      title: manualTitle,
      author: manualAuthor,
      summary: manualSummary,
      content: manualContent,
      updatedAt: new Date().toISOString(),
    });
    setImportNotice('当前草稿已保存。');
  };

  const handleReplaceImage = async (file: File) => {
    const optimizedFile = await optimizeReplacementImageFile(file);
    const url = await readFileAsDataUrl(optimizedFile);
    const before = manualEditorRef.current?.innerHTML;
    replaceImage(manualEditorRef.current, url);
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handlePickImage = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) handleReplaceImage(file);
    });
    input.click();
  };

  const handleImageSize = (value: string) => {
    setActiveImageSize(value);
    const before = manualEditorRef.current?.innerHTML;
    applyImageStyle(manualEditorRef.current, { width: value });
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleImageRadius = (value: number) => {
    setActiveImageRadius(value);
    const before = manualEditorRef.current?.innerHTML;
    applyImageStyle(manualEditorRef.current, { borderRadius: `${value}px` });
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleImageFloat = (float: 'left' | 'right' | 'none') => {
    const before = manualEditorRef.current?.innerHTML;
    applyImageStyle(manualEditorRef.current, { float });
    commitManualEditorDom(before);
    refreshSelection();
  };

  const handleSelectMediaAt = (index: number) => {
    const media = selectMediaInActiveBlock(manualEditorRef.current, index);
    refreshSelection(media);
  };

  const handleManualUndo = () => {
    const history = manualHistoryRef.current;
    const editor = manualEditorRef.current;
    const previous = history.past.pop();
    if (!previous) return;
    const current = editor?.innerHTML || manualContent;
    history.future.push(current);
    if (editor) editor.innerHTML = previous;
    lastSyncedContent.current = previous;
    setManualContent(previous);
    updateManualHistoryState();
    queueMicrotask(() => refreshSelection());
  };

  const handleManualRedo = () => {
    const history = manualHistoryRef.current;
    const editor = manualEditorRef.current;
    const next = history.future.pop();
    if (!next) return;
    const current = editor?.innerHTML || manualContent;
    history.past.push(current);
    if (editor) editor.innerHTML = next;
    lastSyncedContent.current = next;
    setManualContent(next);
    updateManualHistoryState();
    queueMicrotask(() => refreshSelection());
  };

  const handleCopyManualWechatHtml = async () => {
    const html = buildManualWechatHtml();
    try {
      await navigator.clipboard.writeText(html);
      alert('公众号 HTML 已复制，可粘贴到公众号编辑器或支持 HTML 的排版工具中。');
    } catch (err: any) {
      alert(`复制失败: ${err.message || '未知错误'}`);
    }
  };

  const stripHtmlForAssistant = (html: string) => {
    if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, ' ');
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  };

  const getAssistantSourceText = () => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    const selectedText = selection?.toString().trim() || '';
    if (selectedText && manualEditorRef.current?.contains(selection?.anchorNode || null)) return selectedText;
    const contentText = stripHtmlForAssistant(manualEditorRef.current?.innerHTML || manualContent);
    return [manualTitle, manualSummary, contentText].filter(Boolean).join('\n\n');
  };

  const localAssistantFallback = (task: typeof assistantTask, source: string) => {
    const clean = source.replace(/\s+/g, ' ').trim();
    const firstSentence = clean.split(/[。！？!?]/).find(Boolean) || clean.slice(0, 80);
    if (task === 'titles') {
      return [
        `1. ${firstSentence.slice(0, 24)}，真正重要的是什么`,
        `2. 看懂这件事，内容运营会少走很多弯路`,
        `3. 为什么你的公众号文章，总是差一点被读完`,
        `4. 把文章写清楚之前，先把用户想明白`,
        `5. 一个更适合公众号的内容工作流`,
      ].join('\n');
    }
    if (task === 'digest') {
      return `这篇文章围绕“${firstSentence.slice(0, 36)}”展开，帮助读者更清楚地理解问题、优化表达，并形成可执行的公众号内容工作流。`;
    }
    if (task === 'audit') {
      return [
        '检查建议：',
        '1. 开头可以更快进入具体场景，减少抽象铺垫。',
        '2. 每个小节最好保留一个明确观点，避免只做泛泛说明。',
        '3. 如果涉及数据、案例或转载内容，请补充来源，降低事实和侵权风险。',
        '4. 结尾建议给出可执行动作，不要只停留在总结口号。',
      ].join('\n');
    }
    return clean
      .split(/(?<=[。！？!?])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .map((sentence) => sentence.replace(/非常|极其|显著/g, '更').replace(/通过本文我们可以看到/g, '说到底'))
      .join('\n\n');
  };

  const textToWechatHtml = (text: string) =>
    text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const escaped = block
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<p style="margin:14px 0;line-height:1.9;">${escaped.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');

  const handleRunAssistant = async () => {
    const source = getAssistantSourceText();
    if (!source) {
      setAssistantNotice('请先在公众号编辑器里输入正文，或选中一段文字。');
      return;
    }
    setAssistantLoading(true);
    setAssistantNotice(assistantApiKey.trim() ? '正在调用你的模型接口...' : '未填写 API Key，先使用本地轻量助手生成结果。');
    try {
      if (!assistantApiKey.trim()) {
        setAssistantResult(localAssistantFallback(assistantTask, source));
        return;
      }
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: assistantTask,
          content: source,
          baseUrl: assistantBaseUrl,
          model: assistantModel,
          apiKey: assistantApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '智能小助手调用失败');
      setAssistantResult(data.content || '');
      setAssistantNotice(`已使用 ${data.model || assistantModel} 生成结果。`);
    } catch (err: any) {
      setAssistantNotice(err?.message || '智能小助手调用失败。');
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleCopyAssistantResult = async () => {
    if (!assistantResult) return;
    await navigator.clipboard.writeText(assistantResult);
    setAssistantNotice('智能小助手结果已复制。');
  };

  const handleApplyAssistantResult = (mode: 'replace' | 'append') => {
    if (!assistantResult.trim()) return;
    const before = manualEditorRef.current?.innerHTML || manualContent;
    const html = /<\/?[a-z][\s\S]*>/i.test(assistantResult) ? assistantResult : textToWechatHtml(assistantResult);
    const nextContent = mode === 'replace' ? html : `${before}${html}`;
    if (manualEditorRef.current) manualEditorRef.current.innerHTML = nextContent;
    commitManualContent(nextContent, before);
    setAssistantNotice(mode === 'replace' ? '已用助手结果替换正文。' : '已把助手结果追加到正文末尾。');
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

  const manualHtml = buildManualWechatHtml();

  return (
    <main className="app-shell min-h-screen h-screen overflow-hidden text-slate-900 max-lg:h-auto max-lg:overflow-y-auto">
      <header className="h-16 border-b border-slate-100 bg-white/85 px-6 flex items-center justify-between shrink-0 backdrop-blur-xl max-sm:h-auto max-sm:px-4 max-sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-[0_14px_28px_rgba(15,23,42,.16)] ring-1 ring-slate-100">
            <img src="/media/contentcraft-logo.png" alt="ContentCraft" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-[17px] font-extrabold tracking-normal text-slate-950">ContentCraft · 内容匠</h1>
            <p className="text-xs text-slate-500">开源公众号编辑器 | 文章转载 · 样式编辑 · 模块复用 | macOS · Windows · Linux</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-md border border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50 px-2.5 py-1 text-rose-600">
            <Sparkles className="w-3.5 h-3.5" />
             开源版
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
            <Monitor className="w-3.5 h-3.5" />
            HTML 保真导出
          </span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden max-lg:block max-lg:h-auto max-lg:overflow-visible">
        <aside className="w-[340px] shrink-0 border-r border-slate-100 bg-white/78 overflow-y-auto backdrop-blur-xl max-lg:w-full max-lg:border-r-0 max-lg:border-b max-lg:overflow-visible">
          <div className="p-4 space-y-5">
              <div className="grid grid-cols-2 rounded-xl border border-slate-100 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,.05)]">
              <button
                onClick={() => setWorkspaceMode('repost')}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5',
                  workspaceMode === 'repost' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Upload className="w-4 h-4" />
                转载文章
              </button>
              <button
                onClick={() => setWorkspaceMode('wechat')}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5',
                  workspaceMode === 'wechat' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <PenLine className="w-4 h-4" />
                公众号编辑
              </button>
            </div>

            {workspaceMode === 'repost' ? (
              <div className="space-y-5">
                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">导入公众号文章</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">粘贴微信文章链接，自动抓取正文、封面和样式，用于后台转载。</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">文章链接</label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://mp.weixin.qq.com/s/..."
                      className="w-full rounded-lg border border-slate-100 bg-white/90 px-3 py-2.5 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                  <button
                    onClick={fetchArticle}
                    disabled={loading || !url}
                    className="w-full h-10 rounded-lg bg-gradient-to-r from-orange-400 to-rose-500 text-white hover:brightness-105 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm font-semibold shadow-[0_14px_28px_rgba(244,114,182,.22)]"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    获取并解析文章
                  </button>
                  {error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                      {error}
                    </p>
                  )}
                </section>

                {article && (
                  <section className="rounded-xl border border-slate-100 bg-white/80 p-3 space-y-3 shadow-[0_12px_30px_rgba(15,23,42,.04)]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <FileText className="w-4 h-4 text-blue-600" />
                      已解析内容
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">标题</label>
                      <input
                        type="text"
                        value={article.title}
                        readOnly
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                      />
                    </div>
                    {article.desc && (
                      <p className="text-xs leading-5 text-slate-500 line-clamp-3">{article.desc}</p>
                    )}
                  </section>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <section className="space-y-3 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50 p-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-orange-600" />
                    <h2 className="text-sm font-semibold text-slate-950">导入文章到编辑器</h2>
                  </div>
                  <p className="text-xs leading-5 text-orange-900/80">粘贴微信公众号文章链接，直接导入到公众号编辑画布。</p>
                  <input
                    type="text"
                    value={wechatArticleUrl}
                    onChange={(e) => setWechatArticleUrl(e.target.value)}
                    placeholder="https://mp.weixin.qq.com/s/..."
                    className="w-full rounded-lg border border-orange-100 bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFetchArticleIntoWechat('replace')}
                      disabled={wechatImporting || !wechatArticleUrl}
                      className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {wechatImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                      替换正文
                    </button>
                    <button
                      onClick={() => handleFetchArticleIntoWechat('append')}
                      disabled={wechatImporting || !wechatArticleUrl}
                      className="h-10 rounded-lg border border-orange-100 bg-white/90 text-slate-800 hover:bg-white transition flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <List className="w-4 h-4" />
                      追加正文
                    </button>
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">新建公众号内容</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">输入基础信息，在中间画布编辑正文，并插入排版模块。</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">标题</label>
                    <input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-100 bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">作者/来源</label>
                      <input
                        value={manualAuthor}
                        onChange={(e) => setManualAuthor(e.target.value)}
                        className="w-full rounded-lg border border-slate-100 bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">画布宽度</label>
                      <div className="h-[42px] rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center gap-2 text-sm text-slate-500">
                        <Smartphone className="w-4 h-4" />
                        677px
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">摘要</label>
                    <textarea
                      value={manualSummary}
                      onChange={(e) => setManualSummary(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-slate-100 bg-white/90 px-3 py-2.5 text-sm leading-6 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-700">快捷排版</h3>
                    <span className="text-[11px] text-slate-400">插入到光标处</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {manualTemplates.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => insertManualTemplate(item.html)}
                          className="h-10 rounded-lg border border-slate-100 bg-white/80 text-sm text-slate-700 hover:border-orange-200 hover:bg-orange-50 transition flex items-center justify-center gap-2"
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>

        <section className="relative flex-1 min-w-0 flex flex-col overflow-hidden max-lg:min-h-[720px]">
          <div className="h-12 shrink-0 border-b border-slate-100 bg-white/82 px-4 flex items-center justify-between backdrop-blur-xl max-sm:h-auto max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'h-8 px-3 rounded-md text-sm font-medium transition flex items-center gap-1.5',
                  activeTab === 'preview' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                )}
              >
                <Monitor className="w-4 h-4" />
                预览
              </button>
              <button
                onClick={() => setActiveTab('source')}
                className={cn(
                  'h-8 px-3 rounded-md text-sm font-medium transition flex items-center gap-1.5',
                  activeTab === 'source' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                )}
              >
                <Code2 className="w-4 h-4" />
                源代码
              </button>
            </div>
            <div className="text-xs text-slate-500">
              {workspaceMode === 'repost' ? '转载预览：样式隔离 / 图片代理 / CMS 兼容' : '公众号画布：可编辑正文 / 模块化排版'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 max-sm:px-4">
            <div className="mx-auto w-full max-w-[860px]">
              {workspaceMode === 'repost' ? (
                previewContent ? (
                  <div className="overflow-visible rounded-2xl border border-slate-100 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,.08)]">
                    {activeTab === 'preview' ? (
                      <div className="p-0">
                        <IframePreview
                          content={previewContent}
                          styles={previewStyles}
                          cssLinks={previewCssLinks}
                          cssText={previewCssText}
                          iframeRef={previewIframeRef}
                        />
                      </div>
                    ) : (
                      <pre className="min-h-[760px] whitespace-pre-wrap overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                        {previewContent}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="min-h-[640px] rounded-2xl border border-dashed border-slate-200 bg-white/82 flex flex-col items-center justify-center text-center shadow-[0_24px_60px_rgba(15,23,42,.05)]">
                    <Clipboard className="w-14 h-14 text-slate-300" />
                    <h2 className="mt-4 text-base font-semibold text-slate-800">导入一篇公众号文章开始转载</h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">系统会保留原文排版结构，并输出适合 CMS 或旧版富文本编辑器粘贴的 HTML。</p>
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,.08)]">
                  {activeTab === 'preview' ? (
                    <div className="p-6">
                      <div className="mb-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-white/90 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,.04)]">
                          <button
                            onClick={handleManualUndo}
                            disabled={!canUndoManual}
                            className="h-8 px-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="撤回"
                          >
                            撤回
                          </button>
                          <button
                            onClick={handleManualRedo}
                            disabled={!canRedoManual}
                            className="h-8 px-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="重做"
                          >
                            重做
                          </button>
                          <span className="mx-1 h-5 w-px bg-slate-200" />
                          <select
                            value={activeFontFamily}
                            onChange={(e) => handleFontFamily(e.target.value)}
                            className="h-8 max-w-[170px] rounded-md border border-slate-100 bg-white px-2 text-xs text-slate-700"
                            title="字体"
                          >
                            {availableFonts.map((font) => (
                              <option key={font} value={font} style={{ fontFamily: font }}>
                                {font}
                              </option>
                            ))}
                          </select>
                          <select
                            value={activeFontSize}
                            onChange={(e) => handleFontSize(Number(e.target.value))}
                            className="h-8 rounded-md border border-slate-100 bg-white px-2 text-xs text-slate-700"
                            title="字号"
                          >
                            {[12, 14, 15, 16, 18, 20, 24, 28, 32].map((size) => (
                              <option key={size} value={size}>{size}px</option>
                            ))}
                          </select>
                          <button onClick={() => handleStyleCommand('bold')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="加粗">
                            <Bold className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStyleCommand('italic')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="斜体">
                            <Italic className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStyleCommand('underline')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="下划线">
                            <Underline className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStyleCommand('strikeThrough')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="删除线">
                            <Strikethrough className="w-4 h-4" />
                          </button>
                          <label className="h-8 px-2 rounded-md hover:bg-orange-50 text-slate-600 flex items-center gap-1 cursor-pointer" title="文字颜色">
                            <Palette className="w-4 h-4" />
                            <input type="color" value={activeColor} onChange={(e) => handleColor(e.target.value)} className="h-5 w-5 rounded border border-slate-200" />
                          </label>
                          <span className="mx-1 h-5 w-px bg-slate-200" />
                          <button onClick={() => handleApplyAlign('left')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="左对齐">
                            <AlignLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleApplyAlign('center')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="居中">
                            <AlignCenter className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleApplyAlign('right')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="右对齐">
                            <AlignRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleApplyAlign('justify')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="两端对齐">
                            <AlignJustify className="w-4 h-4" />
                          </button>
                          <span className="mx-1 h-5 w-px bg-slate-200" />
                          <button onClick={() => handleApplyFormat('h2')} className="h-8 px-2 rounded-md hover:bg-orange-50 text-slate-600 text-xs font-bold flex items-center" title="二级标题">
                            H2
                          </button>
                          <button onClick={() => handleApplyFormat('h3')} className="h-8 px-2 rounded-md hover:bg-orange-50 text-slate-600 text-xs font-bold flex items-center" title="三级标题">
                            H3
                          </button>
                          <button onClick={() => handleApplyFormat('blockquote')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="引用">
                            <Quote className="w-4 h-4" />
                          </button>
                          <button onClick={() => applyManualCommand('insertUnorderedList')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="项目符号">
                            <List className="w-4 h-4" />
                          </button>
                          <span className="mx-1 h-5 w-px bg-slate-200" />
                          <button onClick={handleInsertLink} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="插入链接">
                            <Link2 className="w-4 h-4" />
                          </button>
                        </div>
                        {selectionInfo?.mode === 'image' ? (
                          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50 p-1.5">
                            <span className="px-2 text-[11px] font-semibold text-orange-700">
                              {selectionInfo.label || '图片'} {selectionInfo.mediaCount ? `${(selectionInfo.mediaIndex ?? 0) + 1}/${selectionInfo.mediaCount}` : ''}
                            </span>
                            {selectionInfo.requiredSize ? (
                              <span className="h-8 rounded-md border border-orange-200 bg-white px-2 text-[11px] font-semibold text-orange-800 flex items-center">
                                建议 {selectionInfo.requiredSize.width} x {selectionInfo.requiredSize.height}px
                                <span className="ml-1 font-normal text-orange-500">({selectionInfo.requiredSize.source})</span>
                              </span>
                            ) : null}
                            {(selectionInfo.mediaCount || 0) > 1 ? (
                              <>
                                <button
                                  onClick={() => handleSelectMediaAt(Math.max(0, (selectionInfo.mediaIndex ?? 0) - 1))}
                                  className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold"
                                  title="选择上一张图片"
                                >
                                  上一张
                                </button>
                                <button
                                  onClick={() =>
                                    handleSelectMediaAt(Math.min((selectionInfo.mediaCount || 1) - 1, (selectionInfo.mediaIndex ?? 0) + 1))
                                  }
                                  className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold"
                                  title="选择下一张图片"
                                >
                                  下一张
                                </button>
                              </>
                            ) : null}
                            <button onClick={handlePickImage} className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold flex items-center gap-1" title="替换图片">
                              <ImagePlus className="w-4 h-4" />
                              替换
                            </button>
                            <button
                              onClick={() => {
                                const url = window.prompt('请输入图片 URL', 'https://');
                                if (!url) return;
                                const before = manualEditorRef.current?.innerHTML;
                                replaceImage(manualEditorRef.current, url);
                                commitManualEditorDom(before);
                                refreshSelection();
                              }}
                              className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold flex items-center gap-1"
                              title="用网络图片替换"
                            >
                              <Link2 className="w-4 h-4" />
                              网络图
                            </button>
                            <span className="mx-1 h-5 w-px bg-orange-200" />
                            <span className="text-[11px] text-orange-800 flex items-center gap-1">
                              <MoveHorizontal className="w-3.5 h-3.5" />
                              <select
                                value={activeImageSize}
                                onChange={(e) => handleImageSize(e.target.value)}
                                className="h-7 rounded-md border border-orange-200 bg-white px-1.5 text-xs"
                              >
                                {['40%', '60%', '80%', '100%'].map((size) => (
                                  <option key={size} value={size}>宽 {size}</option>
                                ))}
                              </select>
                            </span>
                            <span className="text-[11px] text-orange-800 flex items-center gap-1">
                              <MoveVertical className="w-3.5 h-3.5" />
                              圆角
                              <input
                                type="range"
                                min={0}
                                max={48}
                                value={activeImageRadius}
                                onChange={(e) => handleImageRadius(Number(e.target.value))}
                                className="w-20 accent-orange-500"
                              />
                              <span className="w-6 text-right">{activeImageRadius}px</span>
                            </span>
                            <span className="mx-1 h-5 w-px bg-orange-200" />
                            <button onClick={() => handleImageFloat('left')} className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold">左浮动</button>
                            <button onClick={() => handleImageFloat('right')} className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold">右浮动</button>
                            <button onClick={() => handleImageFloat('none')} className="h-8 px-2 rounded-md hover:bg-white text-orange-800 text-xs font-semibold">清浮动</button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-white/90 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,.04)]">
                            <span className="px-2 text-[11px] font-semibold text-slate-500">块操作</span>
                            <button onClick={() => handleBlockAction('up')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="上移">
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleBlockAction('down')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="下移">
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleBlockAction('duplicate')} className="h-8 w-8 rounded-md hover:bg-orange-50 text-slate-600 flex items-center justify-center" title="复制当前块">
                              <CopyIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleBlockAction('remove')} className="h-8 w-8 rounded-md hover:bg-red-50 text-red-600 flex items-center justify-center" title="删除当前块">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <span className="ml-2 text-[11px] text-slate-400">提示：点击正文任意元素，即可激活对应工具栏。</span>
                          </div>
                        )}
                        {selectionInfo ? (
                          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-white shadow-[0_18px_42px_rgba(15,23,42,.22)]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="mr-1 border-l-4 border-blue-500 pl-2 text-sm font-extrabold text-blue-300">样式操作</span>
                              {styleColors.slice(0, 9).map((color) => (
                                <button
                                  key={color}
                                  onClick={() => handleModuleStyle({ themeColor: color })}
                                  className="h-7 w-7 rounded-full border-2 border-white/90 shadow-sm"
                                  style={{ background: color }}
                                  title={`主题色 ${color}`}
                                />
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
                              <button onClick={handleCopyActiveModuleHtml} className="hover:text-blue-200">复制</button>
                              <button onClick={() => handleModuleAction('remove')} className="hover:text-red-200">删除</button>
                              <button onClick={() => handleModuleStyle({ backgroundColor: '#fff7ed' })} className="hover:text-blue-200">背景</button>
                              <button onClick={() => handleModuleAction('up')} className="hover:text-blue-200">上移</button>
                              <button onClick={() => handleModuleAction('down')} className="hover:text-blue-200">下移</button>
                              <button onClick={() => handleModuleAction('blankAfter')} className="hover:text-blue-200">后空行</button>
                              <button onClick={() => handleModuleAction('blankBefore')} className="hover:text-blue-200">前空行</button>
                              <button onClick={handleSaveActiveModule} className="hover:text-blue-200">保存</button>
                              <button onClick={() => handleModuleAction('duplicate')} className="hover:text-blue-200">复制使用</button>
                              <button onClick={() => alert(selectionInfo.moduleElement?.outerHTML || '')} className="hover:text-blue-200">样式代码</button>
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                                宽度比
                                <input type="range" min={40} max={100} value={moduleWidth} onChange={(e) => handleModuleWidth(Number(e.target.value))} className="min-w-0 flex-1 accent-blue-400" />
                                <span className="w-11 rounded border border-slate-500 bg-slate-700 px-1.5 py-0.5 text-center">{moduleWidth}%</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                                间距
                                <input type="range" min={0} max={48} value={moduleMargin} onChange={(e) => handleModuleMargin(Number(e.target.value))} className="min-w-0 flex-1 accent-blue-400" />
                                <span className="w-11 rounded border border-slate-500 bg-slate-700 px-1.5 py-0.5 text-center">{moduleMargin}</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                                内边距
                                <input type="range" min={0} max={48} value={modulePadding} onChange={(e) => handleModulePadding(Number(e.target.value))} className="min-w-0 flex-1 accent-blue-400" />
                                <span className="w-11 rounded border border-slate-500 bg-slate-700 px-1.5 py-0.5 text-center">{modulePadding}</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                                圆角
                                <input type="range" min={0} max={40} value={moduleRadius} onChange={(e) => handleModuleRadius(Number(e.target.value))} className="min-w-0 flex-1 accent-blue-400" />
                                <span className="w-11 rounded border border-slate-500 bg-slate-700 px-1.5 py-0.5 text-center">{moduleRadius}</span>
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
                              <span className="text-blue-300">区域操作</span>
                              {styleColors.slice(9).map((color) => (
                                <button
                                  key={color}
                                  onClick={() => handleModuleStyle({ backgroundColor: color })}
                                  className="h-7 w-7 rounded-full border-2 border-white/80"
                                  style={{ background: color }}
                                  title={`背景 ${color}`}
                                />
                              ))}
                              {gradientColors.map((gradient) => (
                                <button
                                  key={gradient}
                                  onClick={() => handleModuleStyle({ backgroundColor: '#ffffff' })}
                                  className="h-7 w-7 rounded border-2 border-white/80"
                                  style={{ background: gradient }}
                                  title="渐变色预览"
                                />
                              ))}
                              <button onClick={() => handleModuleStyle({ borderColor: '#2563eb', borderWidth: Math.max(1, moduleBorderWidth || 1) })} className="h-8 px-2 rounded-md bg-white/10 hover:bg-white/20 text-xs">边框</button>
                              <button onClick={() => handleModuleBorderWidth(moduleBorderWidth > 0 ? 0 : 1)} className="h-8 px-2 rounded-md bg-white/10 hover:bg-white/20 text-xs">边框线</button>
                              <button onClick={handleModuleShadow} className="h-8 px-2 rounded-md bg-white/10 hover:bg-white/20 text-xs">阴影</button>
                              <label className="h-8 px-2 rounded-md bg-white/10 text-xs flex items-center gap-1">
                                <input type="checkbox" checked={applySimilarStyles} onChange={(e) => setApplySimilarStyles(e.target.checked)} />
                                同类应用
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <article className="mx-auto max-w-[677px] rounded-xl border border-slate-100 bg-white px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,.05)]">
                        <h1 className="text-2xl font-extrabold leading-tight text-slate-950">{manualTitle || '未命名文章'}</h1>
                        {manualAuthor && <p className="mt-2 text-sm text-slate-500">{manualAuthor}</p>}
                        {manualSummary && (
                          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-[15px] leading-7 text-slate-600">
                            {manualSummary}
                          </div>
                        )}
                        <div
                          ref={manualEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            if (isSyncing.current) return;
                            const next = e.currentTarget.innerHTML;
                            const now = Date.now();
                            if (now - lastInputHistoryAt.current > 1500) {
                              pushManualHistory(lastSyncedContent.current);
                              lastInputHistoryAt.current = now;
                            }
                            commitManualContent(next);
                            refreshSelection();
                          }}
                          className="wechat-editor mt-6 min-h-[520px] outline-none"
                        />
                      </article>
                    </div>
                  ) : (
                    <pre className="min-h-[760px] whitespace-pre-wrap overflow-auto bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                      {manualHtml}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>

          {workspaceMode === 'wechat' && activeTab === 'preview' ? (
            <div className="pointer-events-none absolute right-4 top-20 z-30 hidden xl:flex items-start gap-3">
              <div className="pointer-events-auto flex flex-col gap-2">
                <button
                  onClick={() => setWechatImportPanelOpen((current) => !current)}
                  className={cn(
                    'h-11 rounded-lg px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,.28)] transition',
                    wechatImportPanelOpen ? 'bg-slate-950' : 'bg-orange-500 hover:bg-orange-600'
                  )}
                >
                  导入文章
                </button>
                <button onClick={handleCopyManualWechatHtml} className="h-10 rounded-lg border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  复制使用
                </button>
                <button onClick={handleQuickSave} className="h-10 rounded-lg border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  快速保存
                </button>
                <button onClick={handleClearManualContent} className="mt-4 h-10 rounded-lg border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-600">
                  清空内容
                </button>
                <button
                  onClick={() => setImportNotice('生成长图功能需要后续接入截图导出流程；当前可先复制 HTML。')}
                  className="h-10 rounded-lg border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  生成长图
                </button>
              </div>

              {wechatImportPanelOpen ? (
                <div className="pointer-events-auto w-[250px] rounded-xl border border-slate-700 bg-slate-800 p-4 text-white shadow-[0_18px_44px_rgba(15,23,42,.28)]">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-extrabold">导入文章</h3>
                    <button
                      onClick={() => setWechatImportPanelOpen(false)}
                      className="h-7 w-7 rounded-full bg-rose-500 text-white hover:bg-rose-600"
                      title="关闭"
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">粘贴微信公众号文章链接，解析正文后导入到当前画布。</p>
                  <input
                    type="text"
                    value={wechatArticleUrl}
                    onChange={(e) => setWechatArticleUrl(e.target.value)}
                    placeholder="https://mp.weixin.qq.com/s/..."
                    className="mt-3 w-full rounded-lg border border-slate-600 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-400/20"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFetchArticleIntoWechat('replace')}
                      disabled={wechatImporting || !wechatArticleUrl}
                      className="h-9 rounded-lg bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {wechatImporting ? '导入中' : '替换'}
                    </button>
                    <button
                      onClick={() => handleFetchArticleIntoWechat('append')}
                      disabled={wechatImporting || !wechatArticleUrl}
                      className="h-9 rounded-lg bg-white text-sm font-bold text-slate-900 hover:bg-orange-50 disabled:opacity-50"
                    >
                      追加
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <button
                      onClick={() => handleFetchArticleIntoWechat('append')}
                      disabled={wechatImporting || !wechatArticleUrl}
                      className="h-9 rounded-lg bg-white/90 text-sm font-semibold text-slate-800 hover:bg-white disabled:opacity-50"
                    >
                      采集文章
                    </button>
                    <button onClick={() => handlePickDocumentFile('word')} disabled={wechatImporting} className="h-9 rounded-lg bg-white/90 text-sm font-semibold text-slate-800 hover:bg-white disabled:opacity-50">
                      导入 Word
                    </button>
                    <button onClick={() => handlePickDocumentFile('excel')} disabled={wechatImporting} className="h-9 rounded-lg bg-white/90 text-sm font-semibold text-slate-800 hover:bg-white disabled:opacity-50">
                      导入 Excel
                    </button>
                    <button onClick={() => handlePickDocumentFile('pdf')} disabled={wechatImporting} className="h-9 rounded-lg bg-white/90 text-sm font-semibold text-slate-800 hover:bg-white disabled:opacity-50">
                      导入 PDF
                    </button>
                    <button onClick={() => handlePickDocumentFile('ppt')} disabled={wechatImporting} className="h-9 rounded-lg bg-white/90 text-sm font-semibold text-slate-800 hover:bg-white disabled:opacity-50">
                      导入 PPT
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="w-[360px] shrink-0 border-l border-slate-100 bg-white/78 overflow-y-auto backdrop-blur-xl max-lg:w-full max-lg:border-l-0 max-lg:border-t max-lg:overflow-visible">
          <div className="p-4 space-y-5">
            {workspaceMode === 'repost' ? (
              article ? (
                <>
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-950">封面处理</h3>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">裁剪为常见 CMS 封面比例 526 x 350。导出 HTML 不强制依赖封面。</p>
                    {croppedCover ? (
                      <div className="space-y-2">
                        <img src={croppedCover} alt="Cropped Cover" className="w-full rounded-lg border border-slate-200" />
                        <button onClick={() => setCroppedCover('')} className="text-xs font-medium text-blue-600 hover:underline">
                          重新裁剪
                        </button>
                      </div>
                    ) : article.cover ? (
                      <ImageCropper
                        imageSrc={article.cover.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(article.cover)}&ref=${encodeURIComponent(url)}` : article.cover}
                        onCropComplete={setCroppedCover}
                      />
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">未找到封面图片</div>
                    )}
                  </section>

                  <section className="space-y-4 border-t border-slate-200 pt-5">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-slate-700" />
                      <h3 className="text-sm font-semibold text-slate-950">转载导出</h3>
                    </div>
                    <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50 p-3 text-xs leading-5 text-orange-900">
                      <strong className="mb-1 flex items-center gap-1 text-slate-950">
                        <AlertCircle className="w-3.5 h-3.5" />
                        兼容提示
                      </strong>
                      粘贴到微信公众号编辑器、135 类编辑器、CMS 或 KindEditor 时，建议先进入“源代码/HTML”模式。保真模式会把复杂公众号模块转换为更稳定的 HTML。
                    </div>

                    <div className="space-y-3 rounded-xl border border-slate-100 bg-white/82 p-3 shadow-[0_12px_30px_rgba(15,23,42,.04)]">
                      <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                        <input
                          type="checkbox"
                          checked={useProxyInExport}
                          onChange={(e) => setUseProxyInExport(e.target.checked)}
                          className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>使用本地代理图片，仅用于预览或临时排查。</span>
                      </label>
                      <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                        <input
                          type="checkbox"
                          checked={inlineImagesInExport}
                          onChange={(e) => setInlineImagesInExport(e.target.checked)}
                          className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>图片内嵌 Base64，减少后台图片丢失。</span>
                      </label>
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="radio"
                            name="exportFormat"
                            value="kindeditor"
                            checked={exportFormat === 'kindeditor'}
                            onChange={() => setExportFormat('kindeditor')}
                          />
                          简单模式
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="radio"
                            name="exportFormat"
                            value="full"
                            checked={exportFormat === 'full'}
                            onChange={() => setExportFormat('full')}
                          />
                          公众号/135 保真模式
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="w-full h-11 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm font-semibold shadow-[0_14px_28px_rgba(15,23,42,.18)]"
                    >
                      <Copy className="w-4 h-4" />
                      一键复制公众号编辑器 HTML
                    </button>
                    <button
                      onClick={handleCopyPreviewCode}
                      className="w-full h-11 rounded-lg border border-slate-100 bg-white/90 text-slate-800 hover:bg-orange-50 transition flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      <Code2 className="w-4 h-4" />
                      复制预览 HTML
                    </button>
                  </section>
                </>
              ) : (
                <div className="h-full min-h-[520px] flex flex-col items-center justify-center text-center text-slate-400">
                  <Info className="w-10 h-10" />
                  <p className="mt-3 text-sm">导入文章后可处理封面、图片与后台 HTML。</p>
                </div>
              )
            ) : (
              <div className="space-y-5">
                <section className="space-y-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 shadow-[0_12px_30px_rgba(14,165,233,.08)]">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-slate-950 text-white flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">智能小助手</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-600">接入自己的模型接口，优化公众号文字、标题、摘要和风险检查。</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['polish', '润色'],
                      ['titles', '标题'],
                      ['digest', '摘要'],
                      ['humanize', '去 AI 味'],
                      ['audit', '风险检查'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setAssistantTask(value as typeof assistantTask)}
                        className={cn(
                          'h-8 rounded-md border text-xs font-semibold transition',
                          assistantTask === value
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-blue-100 bg-white/86 text-slate-600 hover:bg-white'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <details className="rounded-lg border border-blue-100 bg-white/80 p-2 text-xs">
                    <summary className="cursor-pointer select-none font-semibold text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="inline h-3.5 w-3.5" />
                      模型接口配置
                    </summary>
                    <div className="mt-3 space-y-2">
                      <input
                        value={assistantBaseUrl}
                        onChange={(e) => setAssistantBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full rounded-md border border-blue-100 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                      <input
                        value={assistantModel}
                        onChange={(e) => setAssistantModel(e.target.value)}
                        placeholder="gpt-4.1-mini / deepseek-chat / qwen..."
                        className="w-full rounded-md border border-blue-100 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                      <input
                        value={assistantApiKey}
                        onChange={(e) => setAssistantApiKey(e.target.value)}
                        type="password"
                        placeholder="API Key，仅本次请求使用"
                        className="w-full rounded-md border border-blue-100 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </details>
                  <button
                    onClick={handleRunAssistant}
                    disabled={assistantLoading}
                    className="w-full h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    {assistantLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {assistantApiKey.trim() ? '调用模型生成' : '本地生成预览'}
                  </button>
                  {assistantNotice && (
                    <div className="rounded-lg border border-blue-100 bg-white/82 p-2 text-xs leading-5 text-slate-600">
                      {assistantNotice}
                    </div>
                  )}
                  {assistantResult && (
                    <div className="space-y-2">
                      <textarea
                        value={assistantResult}
                        onChange={(e) => setAssistantResult(e.target.value)}
                        rows={7}
                        className="w-full resize-y rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleCopyAssistantResult} className="h-8 rounded-md border border-blue-100 bg-white text-xs font-semibold text-slate-700 hover:bg-blue-50">
                          复制
                        </button>
                        <button onClick={() => handleApplyAssistantResult('append')} className="h-8 rounded-md border border-blue-100 bg-white text-xs font-semibold text-slate-700 hover:bg-blue-50">
                          追加
                        </button>
                        <button onClick={() => handleApplyAssistantResult('replace')} className="h-8 rounded-md bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700">
                          替换
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-950">内置排版模块</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {manualTemplates.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => insertManualTemplate(item.html)}
                          className="h-12 rounded-lg border border-slate-100 bg-white/86 text-sm text-slate-700 hover:border-orange-200 hover:bg-orange-50 transition flex items-center justify-center gap-2"
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-semibold text-slate-950">导入公众号素材</h3>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    粘贴任意公众号 HTML，可提取定制 SVG、动图、图片和排版块。也可以先在“转载文章”导入一篇优秀公众号，再从当前文章提取。
                  </p>
                  <textarea
                    value={importedHtml}
                    onChange={(e) => setImportedHtml(e.target.value)}
                    rows={5}
                    placeholder="粘贴公众号/编辑器复制出来的 HTML、SVG 或图文模块..."
                    className="w-full resize-none rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5 text-xs leading-5 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExtractImportedHtml}
                      className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      <Sparkles className="w-4 h-4" />
                      提取素材
                    </button>
                    <button
                      onClick={handleExtractFromCurrentArticle}
                      className="h-10 rounded-lg border border-slate-100 bg-white/90 text-slate-800 hover:bg-orange-50 transition flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      <FileText className="w-4 h-4" />
                      从当前文章
                    </button>
                    <button
                      onClick={() => handleImportArticleToWechat('replace')}
                      disabled={!(previewContent || article?.content)}
                      className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <PenLine className="w-4 h-4" />
                      替换到正文
                    </button>
                    <button
                      onClick={() => handleImportArticleToWechat('append')}
                      disabled={!(previewContent || article?.content)}
                      className="h-10 rounded-lg border border-slate-100 bg-white/90 text-slate-800 hover:bg-orange-50 transition flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <List className="w-4 h-4" />
                      追加到末尾
                    </button>
                  </div>
                  {importNotice && (
                    <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50 p-3 text-xs leading-5 text-orange-900">
                      {importNotice}
                    </div>
                  )}
                </section>

                {importedModules.length > 0 && (
                  <section className="space-y-3 border-t border-slate-200 pt-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clipboard className="w-4 h-4 text-slate-700" />
                        <h3 className="text-sm font-semibold text-slate-950">提取结果</h3>
                      </div>
                      <button
                        onClick={saveAllImportedModules}
                        className="h-8 rounded-md border border-slate-100 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-orange-50 flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        全部保存
                      </button>
                    </div>
                    <div className="space-y-3">
                      {importedModules.map((module) => {
                        const updateModule = (patch: Partial<ImportedWechatModule>) => {
                          setImportedModules((current) =>
                            current.map((item) => (item.id === module.id ? { ...item, ...patch } : item))
                          );
                        };
                        return (
                          <div key={module.id} className="rounded-xl border border-slate-100 bg-white/86 p-3 shadow-[0_12px_30px_rgba(15,23,42,.04)] space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                {moduleKindLabel(module.kind)}
                              </span>
                              <input
                                value={module.label}
                                onChange={(e) => updateModule({ label: e.target.value })}
                                className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-100 rounded px-1"
                              />
                              <button
                                onClick={() => setImportedModules((current) => current.filter((item) => item.id !== module.id))}
                                className="h-7 w-7 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                                title="从提取结果中移除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div
                              className="wechat-editor rounded-md border border-slate-100 bg-white p-3"
                              style={{ minHeight: '40px' }}
                              dangerouslySetInnerHTML={{ __html: module.html }}
                            />
                            <details className="rounded-md border border-slate-100 bg-white/70 p-2 text-xs">
                              <summary className="cursor-pointer select-none text-slate-600">编辑 HTML</summary>
                              <textarea
                                value={module.html}
                                onChange={(e) => updateModule({ html: e.target.value })}
                                rows={5}
                                className="mt-2 w-full resize-y rounded border border-slate-100 bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-5 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                              />
                            </details>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => insertManualTemplate(module.html)}
                                className="h-9 rounded-lg bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800"
                              >
                                插入到正文
                              </button>
                              <button
                                onClick={() => saveModuleToLibrary(module)}
                                className="h-9 rounded-lg border border-slate-100 bg-white text-xs font-semibold text-slate-700 hover:bg-orange-50"
                              >
                                保存到素材库
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-semibold text-slate-950">长期素材库</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">{savedModules.length} 个</span>
                  </div>
                  {savedModules.length ? (
                    <div className="space-y-3">
                      {savedModules.slice(0, 12).map((module) => {
                        const updateSaved = (patch: Partial<ImportedWechatModule>) => {
                          setSavedModules((current) =>
                            current.map((item) => (item.id === module.id ? { ...item, ...patch } : item))
                          );
                          wechatModuleStore.put({ ...module, ...patch }).catch(() => undefined);
                        };
                        return (
                          <div key={module.id} className="rounded-xl border border-slate-100 bg-white/86 p-3 shadow-[0_12px_30px_rgba(15,23,42,.04)] space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {moduleKindLabel(module.kind)}
                              </span>
                              <input
                                value={module.label}
                                onChange={(e) => updateSaved({ label: e.target.value })}
                                className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-100 rounded px-1"
                              />
                              <button
                                onClick={() => deleteSavedModule(module.id)}
                                className="h-7 w-7 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                                title="删除素材"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div
                              className="wechat-editor rounded-md border border-slate-100 bg-white p-3"
                              style={{ minHeight: '40px' }}
                              dangerouslySetInnerHTML={{ __html: module.html }}
                            />
                            <details className="rounded-md border border-slate-100 bg-white/70 p-2 text-xs">
                              <summary className="cursor-pointer select-none text-slate-600">编辑 HTML</summary>
                              <textarea
                                value={module.html}
                                onChange={(e) => updateSaved({ html: e.target.value })}
                                rows={5}
                                className="mt-2 w-full resize-y rounded border border-slate-100 bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-5 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                              />
                            </details>
                            <button
                              onClick={() => insertManualTemplate(module.html)}
                              className="h-9 w-full rounded-lg border border-slate-100 bg-white text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                            >
                              插入到正文
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs leading-5 text-slate-500">
                      暂无保存素材。导入公众号模块后点击“保存”，会长期保存在本机 IndexedDB。
                    </div>
                  )}
                </section>

                <section className="space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-slate-700" />
                    <h3 className="text-sm font-semibold text-slate-950">公众号导出</h3>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white/82 p-3 text-xs leading-5 text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,.04)]">
                    输出为内联样式 HTML，适合粘贴到公众号编辑器、135 类排版工具或支持 HTML 的后台编辑器。
                  </div>
                  <button
                    onClick={handleCopyManualWechatHtml}
                    className="w-full h-11 rounded-lg bg-gradient-to-r from-orange-400 to-rose-500 text-white hover:brightness-105 transition flex items-center justify-center gap-2 text-sm font-semibold shadow-[0_14px_28px_rgba(244,114,182,.22)]"
                  >
                    <Copy className="w-4 h-4" />
                    复制公众号 HTML
                  </button>
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
