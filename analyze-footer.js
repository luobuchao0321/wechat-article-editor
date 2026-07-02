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
  
  const content = $('#js_content');
  
  // 1. Analyze Footer Images (GIFs)
  console.log('--- Footer Analysis ---');
  const children = content.children();
  const lastChildren = children.slice(Math.max(0, children.length - 10));
  
  lastChildren.each((i, el) => {
      console.log(`Footer Child ${i}: ${el.tagName}`);
      // Check for images
      const imgs = $(el).find('img');
      if (imgs.length > 0) {
          console.log(`  Contains ${imgs.length} images`);
          imgs.each((j, img) => {
              const src = $(img).attr('data-src') || $(img).attr('src');
              const cls = $(img).attr('class');
              console.log(`    Img ${j} src: ${src?.substring(0, 50)}...`);
              console.log(`    Img ${j} class: ${cls}`);
              console.log(`    Img ${j} style: ${$(img).attr('style')}`);
          });
      }
      // Check for background images
      const style = $(el).attr('style') || '';
      if (style.includes('url(')) {
          console.log(`  Has background image: ${style.substring(0, 100)}...`);
      }
      // Check HTML content for clues
      console.log(`  HTML Snippet: ${$(el).html()?.substring(0, 100)}`);
  });

  // 2. Analyze Borders (Again, looking for nested structures)
  console.log('--- Border Structure Analysis ---');
  // Look for deeply nested elements with borders or backgrounds
  $('*').each((i, el) => {
      const style = $(el).attr('style') || '';
      if (
          style.includes('border-image') || 
          (style.includes('border') && style.includes('solid')) ||
          style.includes('box-shadow')
      ) {
          // console.log(`Potential Border Element: ${el.tagName} style=${style.substring(0, 100)}...`);
      }
  });
}

analyze().catch(console.error);