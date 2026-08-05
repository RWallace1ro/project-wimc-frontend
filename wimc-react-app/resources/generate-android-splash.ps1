Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $PSScriptRoot "icon.png"
$resDir = Join-Path $root "android\app\src\main\res"

function Make-Splash($srcPath, $canvasW, $canvasH, $destPath) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($canvasW, $canvasH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)

    $minDim = [Math]::Min($canvasW, $canvasH)
    $iconSize = [int]($minDim * 0.3)
    $x = [int](($canvasW - $iconSize) / 2)
    $y = [int](($canvasH - $iconSize) / 2)
    $g.DrawImage($srcImg, $x, $y, $iconSize, $iconSize)

    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $srcImg.Dispose()
}

$targets = @(
    @("drawable", 480, 320),
    @("drawable-land-mdpi", 480, 320),
    @("drawable-land-hdpi", 800, 480),
    @("drawable-land-xhdpi", 1280, 720),
    @("drawable-land-xxhdpi", 1600, 960),
    @("drawable-land-xxxhdpi", 1920, 1280),
    @("drawable-port-mdpi", 320, 480),
    @("drawable-port-hdpi", 480, 800),
    @("drawable-port-xhdpi", 720, 1280),
    @("drawable-port-xxhdpi", 960, 1600),
    @("drawable-port-xxxhdpi", 1280, 1920)
)

foreach ($t in $targets) {
    $dir = Join-Path $resDir $t[0]
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $dest = Join-Path $dir "splash.png"
    Make-Splash $src $t[1] $t[2] $dest
    Write-Host "Generated $($t[0]) ($($t[1])x$($t[2]))"
}

Write-Host "Done."
