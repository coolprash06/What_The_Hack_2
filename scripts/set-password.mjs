// Prompts without echoing; stores only a salted hash in the ignored env file.
import { scryptSync, randomBytes } from 'node:crypto';
import readline from 'node:readline';
import fs from 'node:fs';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
process.stdout.write('New password (12+ characters; input hidden): ');
rl._writeToOutput = () => {};
rl.question('', password => {
  rl.close();
  if (password.length < 12) { console.error('\nPassword must have at least 12 characters.'); process.exitCode=1; return; }
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N:32768, r:8, p:1, maxmem:64*1024*1024 }).toString('hex');
  let env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local','utf8') : '';
  env = env.replace(/^AUTH_(USERNAME|PASSWORD_HASH|SECRET|LOCAL_TEST_ONLY)=.*\r?\n?/gm,'');
  const encoded = ['scrypt',salt,hash].join('\\$');
  env += `\nAUTH_USERNAME=Prashanth\nAUTH_PASSWORD_HASH=${encoded}\nAUTH_SECRET=${randomBytes(48).toString('hex')}\nAUTH_LOCAL_TEST_ONLY=false\n`;
  fs.writeFileSync('.env.local',env);
  console.log('\nUpdated .env.local. Restart the server; previous sessions are invalidated.');
});
