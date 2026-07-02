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
  const $ = load(html); // xmlMode: false by default

  // Find Section 4 (by background color)
  const sections = $('section');
  let targetSection = null;
  sections.each((i, el) => {
      const style = $(el).attr('style');
      if (style && style.includes('#fbf2f1')) {
          console.log(`Found target section at index ${i}`);
          targetSection = $(el);
          return false; // break
      }
  });

  if (targetSection) {
      console.log('Target section parent:', targetSection.parent().prop('tagName'));
      console.log('Target section parent id:', targetSection.parent().attr('id'));
      console.log('Target section parent class:', targetSection.parent().attr('class'));
      
      // Check if it is inside #js_content
      const insideJsContent = targetSection.closest('#js_content').length > 0;
      console.log('Is inside #js_content:', insideJsContent);
  } else {
      console.log('Target section not found via cheerio selector');
  }

  // Find SVG
  const svg = $('svg');
  console.log(`Cheerio found ${svg.length} SVGs`);
  if (svg.length > 0) {
      console.log('SVG parent:', svg.parent().prop('tagName'));
      console.log('SVG parent id:', svg.parent().attr('id'));
      console.log('Is SVG inside #js_content:', svg.closest('#js_content').length > 0);
  } else {
      // Regex check location
      const svgIndex = html.indexOf('<svg');
      const jsContentIndex = html.indexOf('id="js_content"');
      const jsContentEndIndex = html.indexOf('</div>', jsContentIndex); // Rough check
      
      console.log(`SVG index: ${svgIndex}`);
      console.log(`#js_content start: ${jsContentIndex}`);
      
      if (svgIndex > jsContentIndex) {
          console.log('SVG appears after #js_content start');
      } else {
          console.log('SVG appears before #js_content start');
      }
  }
}

analyze().catch(console.error);