# Time Radio app icons (192 / 512 / maskable) - run: .\make-icons.ps1
#
# v1.21.12 rework. The old generator drew a SQUARE source inset 15% inside a
# gradient circle with a white square frame -> on the phone it reads as
# "a tiny square inside the round icon". Now the station avatar fills the whole
# circle (circular clip, no inner square, no frame) with a hairline rim, so the
# launcher, the app and the system player all show the same face.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot 'icons'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$src = Join-Path $outDir 'dj-avatar.png'
if (-not (Test-Path $src)) { throw "missing avatar source: $src" }

$c1 = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
$c2 = [System.Drawing.Color]::FromArgb(255, 236, 72, 152)

$img = [System.Drawing.Image]::FromFile($src)
$side = [Math]::Min($img.Width, $img.Height)
$sx = [int](($img.Width - $side) / 2)
$sy = [int](($img.Height - $side) / 2)
$srcRect = New-Object System.Drawing.Rectangle $sx, $sy, $side, $side

function New-CircleIcon {
  param([int]$Size, [string]$Path, [double]$FaceRatio, [bool]$Fill)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'

  if (-not $Fill) {
    $p1 = New-Object System.Drawing.Point 0, 0
    $p2 = New-Object System.Drawing.Point $Size, $Size
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $p1, $p2, $c1, $c2
    $g.FillRectangle($bg, 0, 0, $Size, $Size)
  }

  $d = [int]($Size * $FaceRatio)
  $off = [int](($Size - $d) / 2)
  $dst = New-Object System.Drawing.Rectangle $off, $off, $d, $d
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clip.AddEllipse($off, $off, $d, $d)
  $g.SetClip($clip)
  $g.DrawImage($img, $dst, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.ResetClip()

  $ringW = [Math]::Max(1.0, $Size * 0.016)
  $ringCol = [System.Drawing.Color]::FromArgb(225, 255, 255, 255)
  $ring = New-Object System.Drawing.Pen $ringCol, ([float]$ringW)
  $g.DrawEllipse($ring, ($ringW / 2), ($ringW / 2), ($Size - $ringW), ($Size - $ringW))
  $g.Dispose()

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host ("generated " + $Path)
}

New-CircleIcon -Size 512 -Path (Join-Path $outDir 'icon-512.png') -FaceRatio 0.94 -Fill $true
New-CircleIcon -Size 192 -Path (Join-Path $outDir 'icon-192.png') -FaceRatio 0.94 -Fill $true
New-CircleIcon -Size 512 -Path (Join-Path $outDir 'icon-maskable-512.png') -FaceRatio 0.62 -Fill $false

$img.Dispose()
Write-Host 'icons done'
& (Join-Path $PSScriptRoot 'android\make-launcher-icons.ps1')