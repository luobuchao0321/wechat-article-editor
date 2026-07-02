async function testApi() {
  const url = 'https://mp.weixin.qq.com/s/oYNMtG7wtxLHwZkrNuB5Og';
  const apiUrl = `http://localhost:3001/api/fetch-article?url=${encodeURIComponent(url)}`;
  console.log('Calling API:', apiUrl);
  
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
        console.error('API Error:', res.status, await res.text());
        return;
    }
    const data = await res.json();
    const content = data.content;
    
    console.log('Content length:', content.length);
    
    // Check for #fbf2f1
    if (content.includes('#fbf2f1')) {
        console.log('Found #fbf2f1 in content!');
        // Show context
        const index = content.indexOf('#fbf2f1');
        console.log(content.substring(index - 50, index + 50));
    } else {
        console.log('Did NOT find #fbf2f1 in content.');
    }
    
    // Check for "2026"
    if (content.includes('2026')) {
        console.log('Found "2026" in content.');
    } else {
        console.log('Did NOT find "2026" in content.');
    }
    
  } catch (err) {
      console.error(err);
  }
}

testApi();