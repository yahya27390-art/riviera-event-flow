Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\PC\.gemini\antigravity-ide\brain\7505085c-6711-4450-8937-f83387708d1d\.user_uploaded\media_1789670530227.png"
$publicDir = "c:\Users\Public\مجلد جديد\riviera-event-flow\public"

# 1. Copy logo.png directly
Copy-Item -Path $sourcePath -Destination "$publicDir\logo.png" -Force
Copy-Item -Path $sourcePath -Destination "$publicDir\logo-gold.jpg" -Force
Copy-Item -Path $sourcePath -Destination "$publicDir\favicon.png" -Force
Copy-Item -Path $sourcePath -Destination "$publicDir\apple-touch-icon.png" -Force

Write-Output "Copied direct logo files."

# 2. Generate 1200x630 og-image.png for Social Sharing / SEO Preview
$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Background: Rich Emerald Gradient
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$c1 = [System.Drawing.ColorTranslator]::FromHtml("#051e15")
$c2 = [System.Drawing.ColorTranslator]::FromHtml("#0f382a")
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$gfx.FillRectangle($brush, $rect)

# Draw elegant gold double border
$goldPenOuter = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#c8972e"), 3.0)
$goldPenInner = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#966f1e"), 1.0)
$gfx.DrawRectangle($goldPenOuter, 20, 20, $width - 40, $height - 40)
$gfx.DrawRectangle($goldPenInner, 26, 26, $width - 52, $height - 52)

# Load Logo Image
$logoImg = [System.Drawing.Image]::FromFile($sourcePath)

# Calculate logo position (centered horizontally, upper portion)
$logoTargetWidth = 520
$logoTargetHeight = [int]($logoImg.Height * ($logoTargetWidth / $logoImg.Width))
if ($logoTargetHeight -gt 330) {
    $logoTargetHeight = 330
    $logoTargetWidth = [int]($logoImg.Width * ($logoTargetHeight / $logoImg.Height))
}
$logoX = [int](($width - $logoTargetWidth) / 2)
$logoY = 70

$gfx.DrawImage($logoImg, $logoX, $logoY, $logoTargetWidth, $logoTargetHeight)

# Subtitles & Badges
$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#e2b144"))
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffffff"))
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#94a3b8"))

# Title text
$titleFont = New-Object System.Drawing.Font("Arial", 26, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Regular)
$cityFont = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

# Subtitle line 1
$gfx.DrawString("المنظومة السحابية المتكاملة لإدارة المناسبات والحسابات", $titleFont, $whiteBrush, ($width / 2), ($logoY + $logoTargetHeight + 50), $format)

# Subtitle line 2
$gfx.DrawString("حجوزات القاعات • العقود الرسمية • سندات القبض • كشوف الحسابات", $subFont, $goldBrush, ($width / 2), ($logoY + $logoTargetHeight + 95), $format)

# City / Country tag
$gfx.DrawString("المملكة العربية السعودية • القصيم - بريدة", $cityFont, $mutedBrush, ($width / 2), ($logoY + $logoTargetHeight + 140), $format)

# Save og-image.png
$ogPath = "$publicDir\og-image.png"
$bmp.Save($ogPath, [System.Drawing.Imaging.ImageFormat]::Png)

$logoImg.Dispose()
$gfx.Dispose()
$bmp.Dispose()

Write-Output "Generated og-image.png successfully at $ogPath"
