Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $PSScriptRoot "icon.png"
$assetsDir = Join-Path $root "ios\App\App\Assets.xcassets"

# App icon: Apple rejects icons with alpha transparency, so flatten onto a
# white background at the full 1024x1024 universal size.
function Make-Icon($srcPath, $size, $destPath) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $srcImg.Dispose()
}

$iconDest = Join-Path $assetsDir "AppIcon.appiconset\AppIcon-512@2x.png"
Make-Icon $src 1024 $iconDest
Write-Host "Generated iOS AppIcon (1024x1024, opaque)"

# Splash: logo centered on white, same universal 2732x2732 canvas reused for
# all three scale entries (matches Capacitor's default template layout).
function Make-Splash($srcPath, $canvasSize, $destPath) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $iconSize = [int]($canvasSize * 0.3)
    $offset = [int](($canvasSize - $iconSize) / 2)
    $g.DrawImage($srcImg, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $srcImg.Dispose()
}

$splashDir = Join-Path $assetsDir "Splash.imageset"
foreach ($name in @("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png")) {
    Make-Splash $src 2732 (Join-Path $splashDir $name)
    Write-Host "Generated iOS $name"
}

Write-Host "Done."
