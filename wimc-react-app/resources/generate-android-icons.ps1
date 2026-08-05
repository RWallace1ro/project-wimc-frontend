Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $PSScriptRoot "icon.png"
$resDir = Join-Path $root "android\app\src\main\res"

function Resize-Square($srcPath, $size, $destPath) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $srcImg.Dispose()
}

function Resize-Inset($srcPath, $canvasSize, $iconFraction, $destPath) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $iconSize = [int]($canvasSize * $iconFraction)
    $offset = [int](($canvasSize - $iconSize) / 2)
    $g.DrawImage($srcImg, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $srcImg.Dispose()
}

# density -> (legacy launcher size, adaptive foreground canvas size)
$densities = @{
    "mdpi"    = @(48, 108)
    "hdpi"    = @(72, 162)
    "xhdpi"   = @(96, 216)
    "xxhdpi"  = @(144, 324)
    "xxxhdpi" = @(192, 432)
}

foreach ($d in $densities.Keys) {
    $legacySize = $densities[$d][0]
    $fgSize = $densities[$d][1]
    $dir = Join-Path $resDir "mipmap-$d"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    Resize-Square $src $legacySize (Join-Path $dir "ic_launcher.png")
    Resize-Square $src $legacySize (Join-Path $dir "ic_launcher_round.png")
    Resize-Inset $src $fgSize 0.66 (Join-Path $dir "ic_launcher_foreground.png")
    Write-Host "Generated $d ($legacySize / fg $fgSize)"
}

# Play Store hi-res icon (uploaded separately in Play Console, not part of the APK)
Resize-Square $src 512 (Join-Path $PSScriptRoot "playstore-icon-512.png")
Write-Host "Generated playstore-icon-512.png"

Write-Host "Done."
