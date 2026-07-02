export type EditorMode = 'text' | 'image' | 'block';
export type EditableElement = HTMLElement | SVGElement;

export interface SelectionInfo {
  mode: EditorMode;
  element: EditableElement;
  moduleElement?: Element;
  range?: Range;
  editableElement?: EditableElement;
  mediaCount?: number;
  mediaIndex?: number;
  label?: string;
  requiredSize?: {
    width: number;
    height: number;
    source: string;
  };
}

const elementTag = (el: Element | null) => el?.tagName.toLowerCase() || '';

const hasInlineBackground = (el: Element | null) => {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(el.style.backgroundImage && el.style.backgroundImage !== 'none');
};

export const getModuleElement = (root: HTMLElement | null, start: Element | null): Element | null => {
  if (!root || !start || !root.contains(start)) return null;
  let node: Element | null = start;
  let candidate: Element | null = null;
  while (node && node !== root) {
    candidate = node;
    if (node.parentElement === root) {
      return node;
    }
    node = node.parentElement;
  }
  return candidate;
};

export const isImageElement = (el: Element | null) => {
  if (!el) return false;
  const tag = elementTag(el);
  if (tag === 'img' || tag === 'image' || tag === 'svg') return true;
  if (tag === 'video' || tag === 'iframe') return true;
  if (hasInlineBackground(el)) return true;
  return false;
};

export const getEditableMediaElements = (scope: Element | null): EditableElement[] => {
  if (!scope) return [];
  const found: EditableElement[] = [];
  const push = (node: Element | null) => {
    if (!node) return;
    const tag = elementTag(node);
    if (
      tag === 'img' ||
      tag === 'image' ||
      tag === 'video' ||
      tag === 'iframe' ||
      (tag === 'svg' && !node.querySelector('image,img')) ||
      hasInlineBackground(node)
    ) {
      const editable = node as EditableElement;
      if (!found.includes(editable)) found.push(editable);
    }
  };

  push(scope);
  scope.querySelectorAll('img,image,video,iframe,svg').forEach(push);
  scope.querySelectorAll<HTMLElement>('[style*="background-image"]').forEach(push);
  return found;
};

export const getEditableMediaLabel = (el: Element | null) => {
  const tag = elementTag(el);
  if (tag === 'img') return '图片';
  if (tag === 'image') return 'SVG内图';
  if (tag === 'svg') return 'SVG模块';
  if (tag === 'video') return '视频';
  if (tag === 'iframe') return '嵌入内容';
  if (hasInlineBackground(el)) return '背景图';
  return '图片';
};

const parseNumber = (value: string | null | undefined) => {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundedRectSize = (el: Element | null) => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width > 0 && height > 0) return { width, height };
  return null;
};

export const getMediaRequiredSize = (el: Element | null) => {
  if (!el || typeof window === 'undefined') return undefined;
  const tag = elementTag(el);

  if (tag === 'image') {
    const width = parseNumber(el.getAttribute('width'));
    const height = parseNumber(el.getAttribute('height'));
    if (width > 0 && height > 0) {
      return { width: Math.round(width), height: Math.round(height), source: 'SVG 占位尺寸' };
    }
  }

  if (tag === 'img') {
    const htmlImage = el as HTMLImageElement;
    const attrWidth = parseNumber(htmlImage.getAttribute('width'));
    const attrHeight = parseNumber(htmlImage.getAttribute('height'));
    if (attrWidth > 0 && attrHeight > 0) {
      return { width: Math.round(attrWidth), height: Math.round(attrHeight), source: '图片属性尺寸' };
    }
    if (htmlImage.naturalWidth > 0 && htmlImage.naturalHeight > 0) {
      return { width: htmlImage.naturalWidth, height: htmlImage.naturalHeight, source: '原图像素尺寸' };
    }
  }

  if (tag === 'svg') {
    const viewBox = el.getAttribute('viewBox') || '';
    const parts = viewBox.split(/\s+|,/).map((part) => Number.parseFloat(part)).filter(Number.isFinite);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]), source: 'SVG viewBox 尺寸' };
    }
    const width = parseNumber(el.getAttribute('width'));
    const height = parseNumber(el.getAttribute('height'));
    if (width > 0 && height > 0) {
      return { width: Math.round(width), height: Math.round(height), source: 'SVG 画布尺寸' };
    }
  }

  const rectSize = roundedRectSize(el);
  if (rectSize) {
    return { ...rectSize, source: hasInlineBackground(el) ? '背景图占位尺寸' : '当前渲染尺寸' };
  }

  if (el instanceof HTMLElement) {
    const computed = window.getComputedStyle(el);
    const width = parseNumber(computed.width);
    const height = parseNumber(computed.height);
    if (width > 0 && height > 0) {
      return { width: Math.round(width), height: Math.round(height), source: '样式计算尺寸' };
    }
  }

  return undefined;
};

export const getBlockElement = (start: Node | null): HTMLElement | null => {
  if (!start) return null;
  const stopClass = 'wechat-editor';
  let node: Node | null = start;
  while (node) {
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      if (el.classList.contains(stopClass)) return null;
      const tag = el.tagName.toLowerCase();
      if (
        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol', 'li', 'figure', 'table', 'img', 'image', 'svg', 'section', 'article', 'div'].includes(tag)
      ) {
        return el;
      }
    }
    node = node.parentNode;
  }
  return null;
};

export const detectSelection = (root: HTMLElement | null, eventTarget: Element | null = null): SelectionInfo | null => {
  if (!root) return null;
  const sel = window.getSelection();
  let element: EditableElement | null = null;
  let range: Range | undefined;
  if (eventTarget && root.contains(eventTarget) && !eventTarget.classList.contains('wechat-editor')) {
    const tag = elementTag(eventTarget);
    if (tag === 'img' || tag === 'image' || tag === 'svg' || tag === 'video' || tag === 'iframe') {
      element = eventTarget as EditableElement;
    } else {
      element = getBlockElement(eventTarget) || (eventTarget as EditableElement);
    }
  }
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (root.contains(r.commonAncestorContainer)) {
      range = r;
      const anchor = r.startContainer;
      const startEl =
        anchor.nodeType === 1
          ? (anchor as HTMLElement)
          : (anchor.parentElement as HTMLElement | null);
      const imageCandidate = startEl?.closest('img,image,svg,video,iframe,figure,table,blockquote,pre,section,article,div,li,p,h1,h2,h3,h4,h5,h6,ul,ol,hr') as EditableElement | null;
      if (element) {
        // Prefer the concrete element under the pointer; text selection is only a fallback.
      } else if (eventTarget && root.contains(eventTarget) && !eventTarget.classList.contains('wechat-editor')) {
        const tag = elementTag(eventTarget);
        if (tag === 'img' || tag === 'image' || tag === 'svg' || tag === 'video' || tag === 'iframe') {
          element = eventTarget as EditableElement;
        } else {
          element = getBlockElement(eventTarget) || (eventTarget as EditableElement);
        }
      } else {
        const tagName = elementTag(imageCandidate);
        const imgInside = tagName === 'img' || tagName === 'image' || tagName === 'svg' || tagName === 'video' || tagName === 'iframe';
        if (imageCandidate && root.contains(imageCandidate) && !imageCandidate.classList.contains('wechat-editor')) {
          if (imgInside) {
            element = imageCandidate;
          } else {
            const block = getBlockElement(imageCandidate);
            element = block || imageCandidate;
          }
        } else if (imgInside) {
          element = imageCandidate;
        }
      }
    }
  }
  if (!element) {
    const active = root.querySelector('.is-active-block') as EditableElement | null;
    if (active) element = active;
  }
  if (!element) element = getBlockElement(root.lastChild as Node | null);
  if (!element) return null;
  const imageLike = isImageElement(element)
    || elementTag(element) === 'figure'
    || (element.querySelector?.('img,svg,video') != null);
  const moduleElement = getModuleElement(root, element);
  const mediaElements = imageLike ? getEditableMediaElements(moduleElement || element) : [];
  const tag = elementTag(element);
  const directMedia = tag === 'svg' && mediaElements.length ? mediaElements[0] : isImageElement(element) ? element : mediaElements[0];
  const mediaIndex = directMedia ? Math.max(0, mediaElements.indexOf(directMedia)) : -1;
  return {
    mode: imageLike ? 'image' : 'text',
    element,
    moduleElement: moduleElement || undefined,
    range,
    editableElement: directMedia || undefined,
    mediaCount: mediaElements.length,
    mediaIndex: mediaIndex >= 0 ? mediaIndex : undefined,
    label: getEditableMediaLabel(directMedia || element),
    requiredSize: getMediaRequiredSize(directMedia || element),
  };
};

export const setBlockActive = (root: HTMLElement | null, target: Element | null) => {
  if (!root) return;
  Array.from(root.querySelectorAll('.is-active-block')).forEach((node) => node.classList.remove('is-active-block'));
  if (target && root.contains(target)) target.classList.add('is-active-block');
};

export const setModuleActive = (root: HTMLElement | null, target: Element | null) => {
  if (!root) return;
  Array.from(root.querySelectorAll('.is-active-module')).forEach((node) => node.classList.remove('is-active-module'));
  const module = target ? getModuleElement(root, target) : null;
  if (module && root.contains(module)) module.classList.add('is-active-module');
};

export const selectMediaInActiveBlock = (root: HTMLElement | null, index: number) => {
  if (!root) return null;
  const active = root.querySelector('.is-active-block');
  const scope = active && root.contains(active) ? getModuleElement(root, active) || active : root;
  const media = getEditableMediaElements(scope)[index] || null;
  if (media) setBlockActive(root, media);
  return media;
};

const withSelection = (root: HTMLElement | null, mutator: () => void) => {
  if (!root) return;
  root.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
  mutator();
};

export const applyTextStyle = (root: HTMLElement | null, command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
  withSelection(root, () => {
    document.execCommand(command);
  });
};

export const applyFontSize = (root: HTMLElement | null, size: number) => {
  if (!root) return;
  withSelection(root, () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      range.insertNode(span);
      range.setStart(span, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    document.execCommand('fontSize', false, '7');
    root.querySelectorAll('font[size="7"]').forEach((node) => {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
  });
};

export const applyFontFamily = (root: HTMLElement | null, family: string) => {
  if (!root || !family) return;
  withSelection(root, () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontFamily = family;
      span.appendChild(document.createTextNode('\u200b'));
      range.insertNode(span);
      range.setStart(span.firstChild || span, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    document.execCommand('fontName', false, family);
    root.querySelectorAll('font[face]').forEach((node) => {
      const span = document.createElement('span');
      span.style.fontFamily = (node as HTMLFontElement).face || family;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
  });
};

export const applyTextColor = (root: HTMLElement | null, color: string) => {
  withSelection(root, () => {
    document.execCommand('foreColor', false, color);
  });
};

export const applyBlockAlign = (
  root: HTMLElement | null,
  align: 'left' | 'center' | 'right' | 'justify'
) => {
  const target = getBlockElement(window.getSelection()?.anchorNode || null);
  if (target) {
    target.style.textAlign = align;
  } else if (root) {
    root.style.textAlign = align;
  }
};

export const applyFormat = (root: HTMLElement | null, tag: 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'p') => {
  withSelection(root, () => {
    document.execCommand('formatBlock', false, tag);
  });
};

export const insertLink = (root: HTMLElement | null) => {
  if (!root) return;
  const url = window.prompt('请输入链接地址', 'https://');
  if (!url) return;
  withSelection(root, () => {
    document.execCommand('createLink', false, url);
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      const link = (sel.anchorNode.parentElement as HTMLElement | null)?.closest('a');
      if (link) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
};

export const moveBlock = (root: HTMLElement | null, direction: 'up' | 'down') => {
  if (!root) return;
  const target = root.querySelector('.is-active-block') as HTMLElement | null;
  if (!target) return;
  const swap = direction === 'up' ? target.previousElementSibling : target.nextElementSibling;
  if (!swap) return;
  if (direction === 'up') {
    target.parentNode?.insertBefore(target, swap);
  } else {
    target.parentNode?.insertBefore(swap, target);
  }
};

const blankParagraph = () => {
  const p = document.createElement('p');
  p.innerHTML = '<br>';
  p.setAttribute('data-contentcraft-blank', 'true');
  p.style.minHeight = '1em';
  return p;
};

export const getActiveModuleElement = (root: HTMLElement | null) => {
  if (!root) return null;
  const activeModule = root.querySelector('.is-active-module');
  if (activeModule && root.contains(activeModule)) return activeModule;
  const activeBlock = root.querySelector('.is-active-block');
  return activeBlock ? getModuleElement(root, activeBlock) : null;
};

export const moveActiveModule = (root: HTMLElement | null, direction: 'up' | 'down') => {
  const target = getActiveModuleElement(root);
  if (!target) return;
  const swap = direction === 'up' ? target.previousElementSibling : target.nextElementSibling;
  if (!swap) return;
  if (direction === 'up') {
    target.parentNode?.insertBefore(target, swap);
  } else {
    target.parentNode?.insertBefore(swap, target);
  }
};

export const duplicateActiveModule = (root: HTMLElement | null) => {
  const target = getActiveModuleElement(root);
  if (!target) return;
  const clone = target.cloneNode(true) as Element;
  clone.classList.remove('is-active-module', 'is-active-block');
  target.after(clone);
};

export const removeActiveModule = (root: HTMLElement | null) => {
  const target = getActiveModuleElement(root);
  if (!target) return;
  target.remove();
};

export const insertBlankAroundActiveModule = (root: HTMLElement | null, position: 'before' | 'after') => {
  const target = getActiveModuleElement(root);
  if (!target) return;
  if (position === 'before') {
    target.before(blankParagraph());
  } else {
    target.after(blankParagraph());
  }
};

const isNeutralColor = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'transparent' || normalized === 'none' || normalized === 'currentcolor') return true;
  if (['#fff', '#ffffff', '#000', '#000000', 'white', 'black'].includes(normalized)) return true;
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let raw = hex[1];
    if (raw.length === 3) raw = raw.split('').map((part) => part + part).join('');
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    return Math.max(r, g, b) - Math.min(r, g, b) < 18;
  }
  const rgb = normalized.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 3) return Math.max(parts[0], parts[1], parts[2]) - Math.min(parts[0], parts[1], parts[2]) < 18;
  }
  return false;
};

const replaceSaturatedColors = (value: string, color: string) =>
  value
    .replace(/#[0-9a-f]{3,8}\b/gi, (match) => (isNeutralColor(match) ? match : color))
    .replace(/rgba?\([^)]+\)/gi, (match) => (isNeutralColor(match) ? match : color));

const getStyleKey = (el: Element) =>
  el.getAttribute('data-id') ||
  el.getAttribute('data-style-id') ||
  el.getAttribute('data-contentcraft-module') ||
  el.getAttribute('data-module-label') ||
  el.tagName.toLowerCase();

const getSimilarModules = (root: HTMLElement, active: Element) => {
  const key = getStyleKey(active);
  if (!key) return [active];
  return Array.from(root.children).filter((child) => getStyleKey(child) === key);
};

const applyThemeColor = (module: Element, color: string) => {
  const nodes = [module, ...Array.from(module.querySelectorAll('*'))];
  nodes.forEach((node) => {
    if (node instanceof HTMLElement && node.getAttribute('style')) {
      const style = node.getAttribute('style') || '';
      node.setAttribute('style', replaceSaturatedColors(style, color));
      const inline = node.style;
      ['borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor'].forEach((prop) => {
        const current = inline[prop as any];
        if (current && !isNeutralColor(current)) inline[prop as any] = color;
      });
    }
    ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'].forEach((attr) => {
      const current = node.getAttribute(attr);
      if (current && !isNeutralColor(current)) node.setAttribute(attr, color);
    });
  });
};

export const applyActiveModuleStyle = (
  root: HTMLElement | null,
  patch: {
    themeColor?: string;
    backgroundColor?: string;
    widthPercent?: number;
    padding?: number;
    margin?: number;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    shadow?: boolean;
    applySimilar?: boolean;
  }
) => {
  if (!root) return;
  const active = getActiveModuleElement(root);
  if (!active) return;
  const modules = patch.applySimilar ? getSimilarModules(root, active) : [active];
  modules.forEach((module) => {
    if (patch.themeColor) applyThemeColor(module, patch.themeColor);
    if (module instanceof HTMLElement) {
      if (patch.backgroundColor) module.style.backgroundColor = patch.backgroundColor;
      if (typeof patch.widthPercent === 'number') {
        module.style.width = `${patch.widthPercent}%`;
        module.style.maxWidth = '100%';
        module.style.marginLeft = 'auto';
        module.style.marginRight = 'auto';
      }
      if (typeof patch.padding === 'number') module.style.padding = `${patch.padding}px`;
      if (typeof patch.margin === 'number') module.style.marginTop = module.style.marginBottom = `${patch.margin}px`;
      if (patch.borderColor) module.style.borderColor = patch.borderColor;
      if (typeof patch.borderWidth === 'number') {
        module.style.borderStyle = patch.borderWidth > 0 ? 'solid' : '';
        module.style.borderWidth = patch.borderWidth > 0 ? `${patch.borderWidth}px` : '';
      }
      if (typeof patch.borderRadius === 'number') module.style.borderRadius = `${patch.borderRadius}px`;
      if (typeof patch.shadow === 'boolean') {
        module.style.boxShadow = patch.shadow ? '0 12px 30px rgba(15, 23, 42, 0.14)' : '';
      }
    }
  });
};

export const duplicateBlock = (root: HTMLElement | null) => {
  if (!root) return;
  const target = root.querySelector('.is-active-block') as HTMLElement | null;
  if (!target) return;
  const clone = target.cloneNode(true) as HTMLElement;
  target.after(clone);
};

export const removeBlock = (root: HTMLElement | null) => {
  if (!root) return;
  const target = root.querySelector('.is-active-block') as HTMLElement | null;
  if (!target) return;
  target.remove();
};

export const replaceImage = (root: HTMLElement | null, url: string) => {
  if (!root) return;
  const target = root.querySelector('.is-active-block') as EditableElement | null;
  if (!target) return;
  const tag = elementTag(target);
  if (tag === 'img') {
    target.setAttribute('src', url);
    target.setAttribute('data-src', url);
    return;
  }
  if (tag === 'image') {
    target.setAttribute('href', url);
    target.setAttribute('xlink:href', url);
    target.setAttribute('data-src', url);
    return;
  }
  const img = target.querySelector('img');
  if (img) {
    img.setAttribute('src', url);
    img.setAttribute('data-src', url);
    return;
  }
  const svgImage = target.querySelector('image');
  if (svgImage) {
    svgImage.setAttribute('href', url);
    svgImage.setAttribute('xlink:href', url);
    svgImage.setAttribute('data-src', url);
    return;
  }
  if (target instanceof HTMLElement && target.style.backgroundImage && target.style.backgroundImage !== 'none') {
    target.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
    return;
  }
  const bgTarget = Array.from(target.querySelectorAll<HTMLElement>('*')).find((node) => node.style.backgroundImage && node.style.backgroundImage !== 'none');
  if (bgTarget) {
    bgTarget.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
    return;
  }
  const newImg = document.createElement('img');
  newImg.setAttribute('src', url);
  newImg.setAttribute('style', 'max-width:100%;height:auto;display:block;margin:16px auto;');
  target.appendChild(newImg);
};

export const applyImageStyle = (
  root: HTMLElement | null,
  patch: { width?: string; borderRadius?: string; margin?: string; padding?: string; float?: 'left' | 'right' | 'none' }
) => {
  if (!root) return;
  const target = root.querySelector('.is-active-block') as EditableElement | null;
  if (!target) return;
  const img =
    elementTag(target) === 'img'
      ? (target as HTMLImageElement)
      : (target.querySelector('img') as HTMLImageElement | null);
  if (img) {
    if (patch.width) img.style.width = patch.width;
    if (patch.borderRadius) img.style.borderRadius = patch.borderRadius;
    if (patch.margin) img.style.margin = patch.margin;
    if (patch.padding) img.style.padding = patch.padding;
    if (patch.float) {
      img.style.float = patch.float;
      img.style.maxWidth = patch.float === 'none' ? '' : '60%';
    }
    return;
  }
  const svgImage =
    elementTag(target) === 'image'
      ? target
      : (target.querySelector('image') as HTMLElement | null);
  if (svgImage) {
    if (patch.width) {
      svgImage.style.width = patch.width;
      if (patch.width.endsWith('%')) svgImage.setAttribute('width', patch.width);
    }
    if (patch.borderRadius) svgImage.style.borderRadius = patch.borderRadius;
    if (patch.margin) svgImage.style.margin = patch.margin;
    if (patch.padding) svgImage.style.padding = patch.padding;
    if (patch.float) svgImage.style.float = patch.float;
    return;
  }
  if (patch.width) target.style.width = patch.width;
  if (patch.borderRadius) target.style.borderRadius = patch.borderRadius;
  if (patch.margin) target.style.margin = patch.margin;
  if (patch.padding) target.style.padding = patch.padding;
};

export const buildFileInput = (accept: string) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  return input;
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
