export interface ImportedWechatModule {
  id: string;
  label: string;
  kind: 'layout' | 'svg' | 'gif' | 'image' | 'html';
  html: string;
  previewText: string;
  createdAt?: number;
}

const moduleDbName = 'BianjiqiWechatModuleLibrary';
const moduleStoreName = 'modules';
const moduleDbVersion = 1;

const isBrowser = () => typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

export const moduleKindLabel = (kind: ImportedWechatModule['kind']) => {
  const labels = {
    layout: '排版',
    svg: 'SVG',
    gif: '动图',
    image: '图片',
    html: 'HTML',
  };
  return labels[kind];
};

export const sanitizeImportedHtml = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__import_root__">${html}</div>`, 'text/html');
  const root = doc.getElementById('__import_root__');
  if (!root) return '';

  root.querySelectorAll('script,object,embed').forEach((node) => node.remove());
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
    });

    if (el.tagName.toLowerCase() === 'img') {
      const img = el as HTMLImageElement;
      const rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (rawSrc) {
        const normalized = rawSrc.startsWith('//') ? `https:${rawSrc}` : rawSrc;
        img.setAttribute('src', normalized);
      }
      img.removeAttribute('data-src');
      img.setAttribute('referrerpolicy', 'no-referrer');
      if (!img.style.maxWidth) img.style.maxWidth = '100%';
      if (!img.style.height) img.style.height = 'auto';
    }

    const style = el.getAttribute('style') || '';
    if (style.includes('url(')) {
      el.setAttribute(
        'style',
        style.replace(/url\(\s*(['"]?)(\/\/[^'")]+)\1\s*\)/g, (_match, _quote, raw) => `url('https:${raw}')`)
      );
    }
  });

  root.querySelectorAll('svg').forEach((svg) => {
    if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    (svg as SVGElement).style.maxWidth = '100%';
  });

  return root.innerHTML.trim();
};

const summarizeImportedModule = (el: Element, fallback: string) => {
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 80);
  const img = el.querySelector('img[src]');
  if (img) return img.getAttribute('alt') || img.getAttribute('src') || fallback;
  if (el.querySelector('svg') || el.tagName.toLowerCase() === 'svg') return 'SVG 图形模块';
  return fallback;
};

export const extractWechatModulesFromHtml = (html: string, sourceLabel = '导入素材') => {
  const cleaned = sanitizeImportedHtml(html);
  if (!cleaned) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__import_root__">${cleaned}</div>`, 'text/html');
  const root = doc.getElementById('__import_root__');
  if (!root) return [];

  const modules: ImportedWechatModule[] = [];
  const used = new Set<Element>();
  const seenHtml = new Set<string>();

  const tryClaim = (el: Element | null | undefined): el is Element => {
    if (!el || used.has(el)) return false;
    used.add(el);
    return true;
  };

  const pushModule = (el: Element, kind: ImportedWechatModule['kind'], label: string) => {
    const moduleHtml = el.outerHTML.trim();
    if (!moduleHtml || seenHtml.has(moduleHtml)) return;
    seenHtml.add(moduleHtml);
    modules.push({
      id: `imported-${Date.now()}-${modules.length}`,
      label,
      kind,
      html: moduleHtml,
      previewText: summarizeImportedModule(el, label),
      createdAt: Date.now(),
    });
  };

  const addElement = (el: Element, kind: ImportedWechatModule['kind'], label: string) => {
    if (!tryClaim(el)) return;
    pushModule(el, kind, label);
  };

  Array.from(
    root.querySelectorAll(
      [
        '[data-tools]',
        '[data-id]',
        '[data-role]',
        '[data-brushtype]',
        '[data-darkmode-bgcolor]',
        'section[style]',
        'fieldset[style]',
        'div[style*="background"]',
        'div[style*="border"]',
      ].join(',')
    )
  )
    .slice(0, 16)
    .forEach((el, index) => addElement(el, 'layout', `排版模块 ${index + 1}`));

  Array.from(root.querySelectorAll<HTMLImageElement>('img[src]')).forEach((img, index) => {
    const src = img.getAttribute('src') || '';
    const isGif = /\.gif(?:[?#]|$)/i.test(src) || src.includes('wx_fmt=gif') || src.includes('tp=webp');
    const container = img.closest('section,div,p,figure') || img;
    if (container && container !== root && tryClaim(container)) {
      pushModule(container, isGif ? 'gif' : 'image', `${isGif ? '动图' : '图片'}模块 ${index + 1}`);
    } else if (tryClaim(img)) {
      pushModule(img, isGif ? 'gif' : 'image', `${isGif ? '动图' : '图片'}模块 ${index + 1}`);
    }
  });

  Array.from(root.querySelectorAll('svg')).forEach((svg, index) => {
    const container = svg.closest('section,div,p,figure') || svg;
    if (container && container !== root && tryClaim(container)) {
      pushModule(container, 'svg', `SVG 模块 ${index + 1}`);
    } else if (tryClaim(svg)) {
      pushModule(svg, 'svg', `SVG 模块 ${index + 1}`);
    }
  });

  const tagLabels: Record<string, { kind: ImportedWechatModule['kind']; label: string }> = {
    H1: { kind: 'layout', label: '标题 H1' },
    H2: { kind: 'layout', label: '标题 H2' },
    H3: { kind: 'layout', label: '标题 H3' },
    H4: { kind: 'layout', label: '标题 H4' },
    H5: { kind: 'layout', label: '标题 H5' },
    H6: { kind: 'layout', label: '标题 H6' },
    BLOCKQUOTE: { kind: 'layout', label: '引用' },
    PRE: { kind: 'layout', label: '代码块' },
    TABLE: { kind: 'layout', label: '表格' },
    HR: { kind: 'layout', label: '分隔' },
    UL: { kind: 'layout', label: '列表' },
    OL: { kind: 'layout', label: '列表' },
  };

  Object.entries(tagLabels).forEach(([tag, config]) => {
    Array.from(root.querySelectorAll(tag.toLowerCase())).forEach((el, index) => {
      if (used.has(el)) return;
      if (el.closest('section,article,figure,table,blockquote,pre,h1,h2,h3,h4,h5,h6,ul,ol,hr,div[style]')) {
        return;
      }
      addElement(el, config.kind, `${config.label} ${index + 1}`);
    });
  });

  Array.from(root.querySelectorAll('p')).forEach((p, index) => {
    if (used.has(p)) return;
    if (p.closest('section,article,figure,table,blockquote,pre,h1,h2,h3,h4,h5,h6,ul,ol,hr,div[style]')) {
      return;
    }
    addElement(p, 'layout', `段落 ${index + 1}`);
  });

  if (!modules.length) {
    Array.from(root.children).forEach((el, index) => {
      addElement(el, 'layout', `${sourceLabel}块 ${index + 1}`);
    });
  }

  return modules.slice(0, 12);
};

class WechatModuleStore {
  private db: IDBDatabase | null = null;

  private async open() {
    if (!isBrowser()) throw new Error('当前环境不支持 IndexedDB');
    if (this.db) return this.db;

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(moduleDbName, moduleDbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(moduleStoreName)) {
          const store = db.createObjectStore(moduleStoreName, { keyPath: 'id' });
          store.createIndex('kind', 'kind', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.db;
  }

  async all() {
    const db = await this.open();
    return await new Promise<ImportedWechatModule[]>((resolve, reject) => {
      const tx = db.transaction(moduleStoreName, 'readonly');
      const request = tx.objectStore(moduleStoreName).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const modules = (request.result || []) as ImportedWechatModule[];
        resolve(modules.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 80));
      };
    });
  }

  async put(module: ImportedWechatModule) {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(moduleStoreName, 'readwrite');
      const store = tx.objectStore(moduleStoreName);
      const request = store.put({
        ...module,
        createdAt: module.createdAt || Date.now(),
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async remove(id: string) {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(moduleStoreName, 'readwrite');
      const request = tx.objectStore(moduleStoreName).delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const wechatModuleStore = new WechatModuleStore();
