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
  
  const jsContent = $('#js_content');
  console.log('#js_content found:', jsContent.length > 0);
  console.log('#js_content style:', jsContent.attr('style'));
  console.log('#js_content class:', jsContent.attr('class'));
  
  const richMediaContent = $('.rich_media_content');
  console.log('.rich_media_content found:', richMediaContent.length > 0);
  console.log('.rich_media_content style:', richMediaContent.attr('style'));
  
  // Check first child
  const firstChild = jsContent.children().first();
  console.log('First child tag:', firstChild.prop('tagName'));
  console.log('First child style:', firstChild.attr('style'));
  
  // Check for SVG
  const svgs = $('svg');
  console.log('SVGs found:', svgs.length);
}

analyze().catch(console.error);