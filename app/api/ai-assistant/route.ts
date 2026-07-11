import { NextResponse } from 'next/server';
import { assertSafeRemoteUrl } from '@/lib/server/remoteUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const taskPrompts: Record<string, string> = {
  polish: '润色这篇微信公众号文章。保留事实、观点、第一人称体验和作者语气，让表达更自然、更顺、更像真人写。输出优化后的正文。',
  titles: '为这篇微信公众号文章生成 8 个标题。要求有点击欲但不标题党，兼顾信息密度、情绪张力和搜索友好。每个标题后给一句理由。',
  digest: '为这篇微信公众号文章生成 5 条摘要/导语，每条不超过 120 个中文字符，适合公众号摘要、封面小字或社群转发。',
  humanize: '给这篇微信公众号文章去 AI 味。减少模板化表达，增加自然转折和口语节奏，但不要编造经历或事实。输出优化后的正文。',
  audit: '审阅这篇微信公众号文章，指出表达、结构、事实风险、广告法敏感、侵权转载风险和 AI 味问题。给出可执行修改建议。',
};

const normalizeBaseUrl = (value: string) => {
  const url = (value || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = String(body?.content || '').trim();
    const apiKey = String(body?.apiKey || '').trim();
    const model = String(body?.model || '').trim();
    const baseUrl = normalizeBaseUrl(String(body?.baseUrl || ''));
    const task = String(body?.task || 'polish');

    if (!content) {
      return NextResponse.json({ error: '缺少要优化的文章内容。' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: '缺少 API Key。' }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: '缺少模型名称。' }, { status: 400 });
    }
    if (!baseUrl) {
      return NextResponse.json({ error: '接口地址必须是 http 或 https URL。' }, { status: 400 });
    }

    try {
      await assertSafeRemoteUrl(baseUrl, { allowLocal: process.env.CONTENTCRAFT_DESKTOP === '1' });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || '模型接口地址不安全。' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是微信公众号智能写作小助手。你擅长中文长文润色、标题优化、摘要生成、结构调整、风险检查。必须保留事实，不编造来源，不输出密钥。',
          },
          {
            role: 'user',
            content: `${taskPrompts[task] || taskPrompts.polish}\n\n文章内容：\n\n${content}`,
          },
        ],
        temperature: task === 'audit' ? 0.2 : 0.7,
      }),
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `模型接口返回错误：${upstream.status} ${upstream.statusText} ${text.slice(0, 240)}` },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const result = data?.choices?.[0]?.message?.content || '';
    if (!result) {
      return NextResponse.json({ error: '模型接口没有返回内容。' }, { status: 502 });
    }

    return NextResponse.json({ content: result, model });
  } catch (error: any) {
    const message = error?.name === 'AbortError' ? '模型接口请求超时。' : error?.message || '智能小助手调用失败。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
