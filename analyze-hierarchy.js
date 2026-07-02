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

  // Find Section 4 (by background color)
  let targetSection = null;
  $('section').each((i, el) => {
      const style = $(el).attr('style');
      if (style && style.includes('#fbf2f1')) {
          targetSection = $(el);
          return false;
      }
  });

  if (targetSection) {
      console.log('Target Section (Red Background):');
      console.log('Style:', targetSection.attr('style'));
      
      console.log('Children:');
      targetSection.children().each((i, el) => {
          console.log(`Child ${i}: ${el.tagName}`);
          console.log(`  Style: ${$(el).attr('style')}`);
      });
      
      // Check if children cover the background
      // If children have background-color: white and cover the whole area
  }
}

analyze().catch(console.error);