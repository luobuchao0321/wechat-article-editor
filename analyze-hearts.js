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

  // Look for heart images or gifs
  console.log('--- Analyzing Images ---');
  $('img').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && (src.includes('gif') || src.includes('wx_fmt=gif'))) {
          console.log(`GIF Image ${i}: ${src}`);
          console.log(`  Parent: ${$(el).parent().prop('tagName')}`);
          console.log(`  Style: ${$(el).attr('style')}`);
          console.log(`  Class: ${$(el).attr('class')}`);
      }
  });

  // Look for background images with gif
  console.log('--- Analyzing Background Images ---');
  $('*').each((i, el) => {
      const style = $(el).attr('style');
      if (style && style.includes('url(') && style.includes('gif')) {
          console.log(`Element ${el.tagName} has GIF background:`, style);
      }
  });
  
  // Look for the specific heart structure
  // It might be an SVG or a specific character
  console.log('--- Analyzing Text/Content ---');
  // Often hearts are text or small inline images
}

analyze().catch(console.error);