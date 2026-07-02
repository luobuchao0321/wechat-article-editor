import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const maxFileSize = 25 * 1024 * 1024;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const paragraphize = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin:12px 0;line-height:1.9;">${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('');

const extOf = (name: string) => {
  const match = name.toLowerCase().match(/\.([^.]+)$/);
  return match?.[1] || '';
};

const imageMime = (path: string) => {
  const ext = extOf(path);
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const normalizeZipPath = (base: string, target: string) => {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `${base}/${target}`.split('/');
  const stack: string[] = [];
  parts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') stack.pop();
    else stack.push(part);
  });
  return stack.join('/');
};

const parseXmlText = (xml: string) =>
  Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
    .map((match) => match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
    .join('');

const parsePptx = async (buffer: Buffer) => {
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const entryMap = new Map(entries.map((entry) => [entry.entryName, entry]));
  const slideNames = entries
    .map((entry) => entry.entryName)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml/)?.[1] || 0));

  if (!slideNames.length) throw new Error('未识别到 PPTX 幻灯片内容。');

  const slides = slideNames.map((slideName, index) => {
    const xml = entryMap.get(slideName)?.getData().toString('utf8') || '';
    const textRuns = Array.from(xml.matchAll(/<a:p[\s\S]*?<\/a:p>/g))
      .map((match) => parseXmlText(match[0]).trim())
      .filter(Boolean);

    const relName = slideName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relXml = entryMap.get(relName)?.getData().toString('utf8') || '';
    const imageTargets = Array.from(relXml.matchAll(/Target="([^"]+\.(?:png|jpe?g|gif|webp|svg))"/gi))
      .map((match) => normalizeZipPath('ppt/slides', match[1]))
      .filter((target, targetIndex, all) => all.indexOf(target) === targetIndex);

    const images = imageTargets
      .map((target) => {
        const imageEntry = entryMap.get(target);
        if (!imageEntry) return '';
        const data = imageEntry.getData().toString('base64');
        return `<img src="data:${imageMime(target)};base64,${data}" style="display:block;max-width:100%;height:auto;margin:12px auto;" alt="PPT 图片"/>`;
      })
      .filter(Boolean)
      .join('');

    const paragraphs = textRuns.map((line) => `<p style="margin:8px 0;line-height:1.8;">${escapeHtml(line)}</p>`).join('');
    return `<section style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;"><h3 style="margin:0 0 12px;font-size:16px;line-height:1.5;">第 ${index + 1} 页</h3>${paragraphs}${images}</section>`;
  });

  return slides.join('');
};

const parseDocx = async (buffer: Buffer) => {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const data = await image.read('base64');
        return {
          src: `data:${image.contentType};base64,${data}`,
          style: 'display:block;max-width:100%;height:auto;margin:12px auto;',
        };
      }),
    }
  );
  return result.value;
};

const tableOnly = (html: string) => {
  const match = html.match(/<table[\s\S]*<\/table>/i);
  return match ? match[0] : html;
};

const parseExcel = async (buffer: Buffer, ext: string) => {
  const XLSX = await import('xlsx');
  const workbook = ext === 'csv'
    ? XLSX.read(buffer.toString('utf8'), { type: 'string' })
    : XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames.map((name) => {
    const html = tableOnly(XLSX.utils.sheet_to_html(workbook.Sheets[name], { id: `sheet-${name}` }));
    return `<section style="margin:24px 0;"><h3 style="margin:0 0 12px;font-size:16px;">${escapeHtml(name)}</h3><div style="overflow-x:auto;">${html}</div></section>`;
  }).join('');
};

const parsePdf = async (buffer: Buffer) => {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const html = paragraphize(data.text || '');
  await parser.destroy();
  if (!html) throw new Error('PDF 未提取到可用文字，可能是扫描图片版 PDF。');
  return html;
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('请上传一个文件。');
    if (file.size > maxFileSize) throw new Error('文件超过 25MB，请压缩后再导入。');

    const name = file.name || '未命名文件';
    const ext = extOf(name);
    const buffer = Buffer.from(await file.arrayBuffer());
    let html = '';
    let type = '';

    if (ext === 'docx') {
      html = await parseDocx(buffer);
      type = 'Word';
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      html = await parseExcel(buffer, ext);
      type = 'Excel';
    } else if (ext === 'pdf') {
      html = await parsePdf(buffer);
      type = 'PDF';
    } else if (ext === 'pptx') {
      html = await parsePptx(buffer);
      type = 'PPT';
    } else if (ext === 'ppt') {
      throw new Error('暂不支持老式 .ppt，请另存为 .pptx 后导入。');
    } else {
      throw new Error('暂不支持该文件类型。支持 docx、xlsx、xls、csv、pdf、pptx。');
    }

    return NextResponse.json({ title: name.replace(/\.[^.]+$/, ''), type, html });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '文件解析失败。' }, { status: 400 });
  }
}
