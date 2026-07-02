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
  
  const regex = /<svg[\s\S]*?<\/svg>/g;
  const matches = html.match(regex);
  
  if (matches) {
      console.log(`Found ${matches.length} SVGs via Regex`);
      matches.forEach((svg, i) => {
          console.log(`SVG ${i} length: ${svg.length}`);
          console.log(`SVG ${i} snippet:`, svg.substring(0, 200));
          console.log(`SVG ${i} location:`, html.indexOf(svg));
      });
  } else {
      console.log('No SVGs found via Regex');
  }
}

analyze().catch(console.error);