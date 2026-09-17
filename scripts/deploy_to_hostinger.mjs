import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';

async function deploy() {
  const rawHost = process.env.HOSTINGER_FTP_SERVER || '82.198.228.36';
  const rawUser = process.env.HOSTINGER_FTP_USERNAME || '';
  const rawPass = process.env.HOSTINGER_FTP_PASSWORD || '';

  const host = rawHost.trim().replace(/[\r\n\t ]/g, '');
  const user = rawUser.trim().replace(/[\r\n\t ]/g, '');
  const password = rawPass.trim().replace(/[\r\n]/g, '');

  console.log('--- Hostinger Deployment Diagnostic ---');
  console.log(`Cleaned Server: "${host}" (Length: ${host.length})`);
  console.log(`Username defined: ${Boolean(user)} (Length: ${user.length})`);
  console.log(`Password defined: ${Boolean(password)} (Length: ${password.length})`);

  if (!user || !password) {
    console.error('❌ Missing HOSTINGER_FTP_USERNAME or HOSTINGER_FTP_PASSWORD in GitHub Secrets!');
    process.exit(1);
  }

  const client = new ftp.Client(45000);
  client.ftp.verbose = true;

  // Try Plain FTP first, then FTPS
  const modes = [
    { name: 'Plain FTP (port 21)', secure: false, port: 21 },
    { name: 'Explicit FTPS (port 21)', secure: true, port: 21 },
  ];

  let connected = false;
  for (const mode of modes) {
    try {
      console.log(`\n🔄 Attempting connection via ${mode.name} to ${host}:${mode.port}...`);
      await client.access({
        host,
        user,
        password,
        port: mode.port,
        secure: mode.secure,
      });
      console.log(`✅ Connected successfully using ${mode.name}!`);
      connected = true;
      break;
    } catch (e) {
      console.warn(`⚠️ Connection via ${mode.name} failed:`, e.message);
      client.close();
    }
  }

  if (!connected) {
    console.error('❌ All connection modes failed! Please verify FTP Server, Username and Password.');
    process.exit(1);
  }

  try {
    const pwd = await client.pwd();
    console.log(`📂 Current directory on server: ${pwd}`);

    const list = await client.list();
    console.log(`📋 Existing files on server:`, list.map(f => f.name));

    let targetDir = pwd;
    if (list.some(f => f.name === 'public_html')) {
      console.log('📁 Entering public_html directory...');
      await client.cd('public_html');
      targetDir = await client.pwd();
      console.log(`📂 Now in: ${targetDir}`);
    }

    const distPath = path.resolve('dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('dist folder does not exist! Please run npm run build first.');
    }

    console.log(`🚀 Uploading production build from ${distPath} to Hostinger ${targetDir}...`);
    await client.uploadFromDir(distPath);
    console.log('🎉 ALL FILES UPLOADED TO HOSTINGER SUCCESSFULLY 100%!');
  } catch (err) {
    console.error('❌ Upload execution failed:', err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
