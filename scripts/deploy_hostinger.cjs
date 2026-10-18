const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

async function deployHostinger() {
  const client = new ftp.Client(30000);
  client.ftp.verbose = true;

  try {
    console.log('📡 Connecting to Hostinger FTP (82.198.228.36)...');
    await client.access({
      host: '82.198.228.36',
      user: 'u602943255.white-chimpanzee-265083.hostingersite.com',
      password: process.env.HOSTINGER_FTP_PASSWORD || 'Dell2020KoKa*',
      port: 21,
      secure: false
    });
    console.log('✓ Connected to Hostinger successfully!');

    const distPath = path.resolve(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('dist directory does not exist. Please run npm run build first.');
    }

    console.log(`🚀 Uploading production build from: ${distPath}`);
    await client.uploadFromDir(distPath);
    console.log('\n======================================================');
    console.log('🎉 SUCCESS: All files uploaded to Hostinger successfully!');
    console.log('🔗 Live Hostinger URL: https://white-chimpanzee-265083.hostingersite.com');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Upload failed:', err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

deployHostinger();
