import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceLogo = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\7505085c-6711-4450-8937-f83387708d1d\\.user_uploaded\\media_1789670530227.png';
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

console.log('Copying logo to public directory...');

// 1. Copy to all required logo filenames
fs.copyFileSync(sourceLogo, path.join(publicDir, 'logo.png'));
fs.copyFileSync(sourceLogo, path.join(publicDir, 'logo-gold.jpg'));
fs.copyFileSync(sourceLogo, path.join(publicDir, 'favicon.png'));
fs.copyFileSync(sourceLogo, path.join(publicDir, 'apple-touch-icon.png'));

console.log('Direct logo assets copied successfully.');

// 2. Generate og-image.png using PowerShell with Base64 encoded script to prevent encoding issues
const psScript = `
Add-Type -AssemblyName System.Drawing
$source = "${sourceLogo.replace(/\\/g, '\\\\')}"
$dest = "${path.join(publicDir, 'og-image.png').replace(/\\/g, '\\\\')}"

$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$c1 = [System.Drawing.ColorTranslator]::FromHtml("#051e15")
$c2 = [System.Drawing.ColorTranslator]::FromHtml("#0f382a")
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$gfx.FillRectangle($brush, $rect)

$goldPenOuter = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#c8972e"), 3.0)
$goldPenInner = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#966f1e"), 1.0)
$gfx.DrawRectangle($goldPenOuter, 20, 20, $width - 40, $height - 40)
$gfx.DrawRectangle($goldPenInner, 26, 26, $width - 52, $height - 52)

$logoImg = [System.Drawing.Image]::FromFile($source)
$targetW = 600
$targetH = [int]($logoImg.Height * ($targetW / $logoImg.Width))
if ($targetH -gt 420) {
  $targetH = 420
  $targetW = [int]($logoImg.Width * ($targetH / $logoImg.Height))
}
$posX = [int](($width - $targetW) / 2)
$posY = [int](($height - $targetH) / 2) - 10

$gfx.DrawImage($logoImg, $posX, $posY, $targetW, $targetH)

$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#e2b144"))
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffffff"))
$fontSub = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

$bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)

$logoImg.Dispose()
$gfx.Dispose()
$bmp.Dispose()
`;

const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');
execSync(`powershell -EncodedCommand ${encodedCommand}`);

console.log('og-image.png created successfully.');
