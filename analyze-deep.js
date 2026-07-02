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
  
  // 1. Check body style
  console.log('Body style:', $('body').attr('style'));
  console.log('Body class:', $('body').attr('class'));
  
  // 2. Check rich_media_area_primary_inner
  const inner = $('.rich_media_area_primary_inner');
  console.log('Inner style:', inner.attr('style'));
  
  // 3. Search for background-color in all style tags
  const styleTags = $('style');
  console.log(`Found ${styleTags.length} style tags`);
  styleTags.each((i, el) => {
      const content = $(el).html();
      if (content.includes('background-color') || content.includes('background:')) {
          // console.log(`Style ${i} has background`);
      }
      // Check for specific classes found on #js_content
      if (content.includes('autoTypeSetting24psection')) {
          console.log(`Style ${i} contains autoTypeSetting24psection`);
          console.log(content.substring(content.indexOf('autoTypeSetting24psection'), content.indexOf('autoTypeSetting24psection') + 200));
      }
  });

  // 4. Check for SVG again (regex)
  const svgRegex = /<svg/g;
  const svgMatches = html.match(svgRegex);
  console.log(`Regex found ${svgMatches ? svgMatches.length : 0} <svg tags`);
  
  // 5. Check for section tags with background
  $('section').each((i, el) => {
      const style = $(el).attr('style');
      if (style && (style.includes('background') || style.includes('background-color'))) {
          console.log(`Section ${i} has background:`, style);
      }
  });
}

analyze().catch(console.error);