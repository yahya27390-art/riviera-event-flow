import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';

async function deploy() {
  const host = process.env.HOSTINGER_FTP_SERVER || '82.198.228.36';
  const user = process.env.HOSTINGER_FTP_USERNAME;
  const password = process.env.HOSTINGER_FTP_PASSWORD;

  if (!user || !password) {
    console.error('❌ Missing FTP username or password in environment variables.');
    process.exit(1);
  }

  const client = new ftp.Client(45000);
  client.ftp.verbose = true;

  try {
    console.log(`📡 Connecting to Hostinger FTP server: ${host}:21 as ${user}...`);
    await client.access({
      host,
      user,
      password,
      port: 21,
      secure: false,
    });

    console.log('✅ FTP Connected successfully!');
    const pwd = await client.pwd();
    console.log(`📂 Current server directory: ${pwd}`);

    const list = await client.list();
    console.log(`📋 Server contents:`, list.map(f => f.name));

    let targetDir = pwd;
    if (list.some(f => f.name === 'public_html')) {
      console.log('📁 Entering public_html directory...');
      await client.cd('public_html');
      targetDir = await client.pwd();
    }

    const distPath = path.resolve('dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('dist folder does not exist! Please run npm run build first.');
    }

    console.log(`🚀 Uploading production build from ${distPath} to Hostinger ${targetDir}...`);
    await client.uploadFromDir(distPath);
    console.log('🎉 ALL FILES UPLOADED TO HOSTINGER SUCCESSFULLY 100%!');
  } catch (err) {
    console.error('❌ Deployment error:', err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
