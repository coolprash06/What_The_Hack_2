import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes, scryptSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { configuration, verifyCredentials, createSession, validSession, loginLimit, sameOrigin, TTL } from '../lib/auth/core.ts';
const password = randomBytes(24).toString('hex');
const salt = randomBytes(16).toString('hex');
process.env.AUTH_USERNAME = 'test-account';
process.env.AUTH_SECRET = randomBytes(48).toString('hex');
process.env.AUTH_PASSWORD_HASH = `scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
process.env.AUTH_LOCAL_TEST_ONLY = 'true';

function signed(payload) {
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  return encoded+'.'+createHmac('sha256',process.env.AUTH_SECRET).update(encoded).digest('hex');
}

test('stateless sessions work across instances and reject tampering, expiry and wrong accounts', () => {
  const token=createSession();
  assert.equal(TTL,12*60*60);
  assert.equal(validSession(token),true);
  const payload=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString());
  assert.equal(payload.username,process.env.AUTH_USERNAME);
  assert.ok(payload.expiry>Math.floor(Date.now()/1000));
  const child=spawnSync(process.execPath,['--input-type=module','-e',
    `import { validSession } from './lib/auth/core.ts'; process.exit(validSession(process.env.TEST_SESSION) ? 0 : 1);`],
    {env:{...process.env,TEST_SESSION:token},encoding:'utf8'});
  assert.equal(child.status,0,'A fresh process must accept the same signed session');
  assert.equal(validSession(),false);
  for(const malformed of ['', 'a.b',token+'.extra','x'.repeat(3000)]) assert.equal(validSession(malformed),false);
  assert.equal(validSession(token.slice(0,-1)+(token.endsWith('a')?'b':'a')),false);
  assert.equal(validSession(signed({...payload,username:'another-account'})),false);
  assert.equal(validSession(signed({...payload,expiry:'tomorrow'})),false);
  assert.equal(validSession(signed({...payload,expiry:Math.floor(Date.now()/1000)-1})),false);
  const clock=Date.now;
  try {
    Date.now=()=>payload.expiry*1000;
    assert.equal(validSession(token),false,'Expiry boundary must reject the cookie');
  } finally { Date.now=clock; }
  const secret=process.env.AUTH_SECRET;
  try {
    process.env.AUTH_SECRET=randomBytes(48).toString('hex');
    assert.equal(validSession(token),false,'Secret rotation invalidates previous cookies');
  } finally { process.env.AUTH_SECRET=secret; }
});

test('credential verification stays valid after rate-limit exhaustion', async () => {
  assert.equal(await verifyCredentials('test-account',password),true);
  assert.equal(await verifyCredentials('wrong-account',password),false);
  assert.equal(await verifyCredentials('test-account','wrong'),false);
  for(let i=0;i<5;i++) assert.equal(loginLimit(),0);
  assert.ok(loginLimit()>0);
  assert.equal(await verifyCredentials('test-account',password),true);
  const clock=Date.now;
  try {
    Date.now=()=>clock()+16*60*1000;
    assert.equal(loginLimit(),0);
  } finally { Date.now=clock; }
});

test('same-origin and production safeguards remain enforced', async () => {
  assert.equal(sameOrigin(new Request('http://localhost/api',{headers:{origin:'http://evil.test'}})),false);
  assert.equal(sameOrigin(new Request('http://localhost/api',{headers:{origin:'http://localhost'}})),true);
  const previous=process.env.NODE_ENV;
  try {
    process.env.NODE_ENV='production';
    assert.throws(configuration);
    process.env.AUTH_LOCAL_TEST_ONLY='false';
    assert.equal(await verifyCredentials('test-account',password),true);
    const weak='short-test';
    process.env.AUTH_PASSWORD_HASH=`scrypt$${salt}$${scryptSync(weak,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
    assert.equal(await verifyCredentials('test-account',weak),false);
  } finally {
    if(previous===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=previous;
  }
});
