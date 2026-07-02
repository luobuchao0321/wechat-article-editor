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
  
  const images = $('img');
  console.log(`Found ${images.length} images`);
  
  images.each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      // console.log(`Image ${i}: ${src}`);
      if (src && src.includes('mmbiz_png')) {
           // console.log(`  PNG Image ${i}`);
      }
  });

  // Check for the banner specifically
  // The banner likely appears at the top
  const firstImage = images.first();
  console.log('First image src:', firstImage.attr('data-src') || firstImage.attr('src'));
  
  // Check for background images
  $('*').each((i, el) => {
      const style = $(el).attr('style');
      if (style && style.includes('url(')) {
          console.log(`Element ${el.tagName} has background image:`, style);
      }
  });
}

analyze().catch(console.error);