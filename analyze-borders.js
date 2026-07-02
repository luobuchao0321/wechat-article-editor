import { load } from 'cheerio';
import { Agent } from 'undici';
import dns from 'node:dns';

const ipv4OnlyDispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      if (hostname === 'mmbiz.qpic.cn' || hostname === 'qpic.cn') {
          const ips = ['101.227.173.23', '113.96.233.100'];
          const selected = ips[Math.floor(Math.random() * ips.length)];
          return callback(null, [{ address: selected, family: 4 }]);
      }
      dns.lookup(hostname, { ...options, family: 4 }, callback);
    },
  },
});

async function fetchArticle(url) {
  const response = await fetch(url, {
    dispatcher: ipv4OnlyDispatcher,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  return await response.text();
}

async function analyze() {
  const url = 'https://mp.weixin.qq.com/s/oYNMtG7wtxLHwZkrNuB5Og';
  console.log('Fetching:', url);
  const html = await fetchArticle(url);
  const $ = load(html);

  // Analyze the structure around the main content to find borders
  // Usually top/bottom borders are separate sections or images at the start/end of #js_content
  const content = $('#js_content');
  
  console.log('--- Top Elements ---');
  content.children().slice(0, 5).each((i, el) => {
      console.log(`Child ${i}: ${el.tagName}`);
      console.log(`  Style: ${$(el).attr('style')}`);
      console.log(`  Class: ${$(el).attr('class')}`);
      console.log(`  Inner Text: ${$(el).text().substring(0, 50).trim()}`);
      console.log(`  Inner HTML Snippet: ${$(el).html()?.substring(0, 100)}`);
  });

  console.log('--- Bottom Elements ---');
  const count = content.children().length;
  content.children().slice(Math.max(0, count - 5)).each((i, el) => {
      console.log(`Child ${count - 5 + i}: ${el.tagName}`);
      console.log(`  Style: ${$(el).attr('style')}`);
      console.log(`  Inner HTML Snippet: ${$(el).html()?.substring(0, 100)}`);
  });
}

analyze().catch(console.error);