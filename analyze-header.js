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

  const inner = $('.rich_media_area_primary_inner');
  console.log('Inner found:', inner.length > 0);
  
  if (inner.length > 0) {
      // List immediate children
      inner.children().each((i, el) => {
          console.log(`Child ${i}: ${el.tagName} id=${$(el).attr('id')} class=${$(el).attr('class')}`);
          if (el.tagName === 'div' && $(el).find('svg').length > 0) {
              console.log(`  -> Contains ${$(el).find('svg').length} SVGs`);
          }
      });
  }
}

analyze().catch(console.error);