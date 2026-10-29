import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN || 'http://localhost:3000';
const post=(path,body,cookie)=>fetch(origin+path,{method:'POST',redirect:'manual',headers:{origin,'content-type':'application/json',...(cookie?{cookie}: {})},body:JSON.stringify(body)});
let response=await fetch(origin+'/',{redirect:'manual'});
// With streamed Suspense, Next may emit a redirect in HTML instead of a 307.
assert.ok(response.status===307 || (await response.text()).includes('/login'));
response=await fetch(origin+'/minecraft/index.html');
assert.equal(response.status,200);
const html=await response.text();
assert.ok(html.includes('/api/auth/login'));
assert.ok(!html.includes('diamondpickaxe'));
assert.equal((await post('/api/verdict',{})).status,401);
assert.ok([401,429].includes((await post('/api/auth/login',{username:'wrong',password:'wrong'})).status));
const fs=await import('node:fs');
const env=fs.readFileSync('.env.local','utf8');
assert.ok(env.includes('AUTH_LOCAL_TEST_ONLY=true'),'Run HTTP test only with local test credentials');
response=await post('/api/auth/login',{username:'Prashanth',password:['Petty','Court'].join('')});
assert.equal(response.status,200);
const setCookie=response.headers.get('set-cookie');
assert.ok(setCookie.includes('HttpOnly'));
assert.ok(setCookie.includes('SameSite=strict'));
const cookie=setCookie.split(';')[0];
response=await fetch(origin+'/',{headers:{cookie}});
assert.equal(response.status,200);
assert.ok((await response.text()).includes('Log out'));
// Invalid case proves the authenticated route is reached without spending Groq credits.
assert.equal((await post('/api/verdict',{},cookie)).status,400);
response=await fetch(origin+'/api/verdict',{method:'POST',headers:{cookie,origin:'https://evil.test'},body:'{}'});
assert.equal(response.status,403);
const logout=await post('/api/auth/logout',{},cookie);
assert.equal(logout.status,303);
assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
assert.equal((await post('/api/verdict',{})).status,401,'Cleared cookie must deny access');
assert.equal((await post('/api/verdict',{},cookie)).status,400,'Stateless cookies remain valid until expiry');
for(let i=0;i<6;i++) {
  response=await post('/api/auth/login',{username:'wrong',password:'wrong'});
  assert.ok([401,429].includes(response.status));
  if(response.status===429) break;
}
assert.equal(response.status,429);
assert.ok(Number(response.headers.get('retry-after'))>0);
response=await post('/api/auth/login',{username:'Prashanth',password:['Petty','Court'].join('')});
assert.equal(response.status,200,'Valid credentials must bypass an exhausted rate limit');
console.log('HTTP auth checks passed; no Groq request was made.');
