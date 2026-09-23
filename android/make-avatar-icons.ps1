# Build branded app icons from an avatar/sticker image.
#   .\make-avatar-icons.ps1 "C:\path\to\avatar.jpg"
# Layout: gradient circle background + source image (square) centered at 70%
# (56% for the maskable safe zone) + white frame line, so nothing important
# gets cut when the launcher applies a circular mask.
# Also regenerates res/mipmap-*/ic_launcher.png via make-launcher-icons.ps1.
# ASCII-only comments (build machines use any locale).
param(
  [Parameter(Mandatory = $true)][string]$AvatarPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $AvatarPath)) { throw "avatar not found: $AvatarPath" }
$webRoot = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $webRoot 'icons'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

$c1 = [System.Drawing.Color]::FromArgb(139, 92, 246)   # #8b5cf6
$c2 = [System.Drawing.Color]::FromArgb(236, 72, 152)   # #ec4899

$img = [System.Drawing.Image]::FromFile($AvatarPath)
try {
  # Honor EXIF orientation (phone / chat exports often carry it).
  $orient = 0
  try {
    foreach ($p in $img.PropertyItems) {
      if ($p.Id -eq 0x0112 -and $p.Len -ge 2) { $orient = [BitConverter]::ToUInt16($p.Value, 0) }
    }
  } catch { }
  if ($orient -eq 3) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
  if ($orient -eq 6) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
  if ($orient -eq 8) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }

  # Center-crop source rectangle (square).
  $side = [Math]::Min($img.Width, $img.Height)
  $sx = [int](($img.Width - $side) / 2)
  $sy = [int](($img.Height - $side) / 2)
  $srcRect = New-Object System.Drawing.Rectangle $sx, $sy, $side, $side

  # --- circular icon: gradient bg + 70% inset image + white frame ---
  foreach ($spec in @( @{n = 'icon-512.png'; s = 512}, @{n = 'icon-192.png'; s = 192} )) {
    $size = [int]$spec.s
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.SmoothingMode = 'AntiAlias'
      $g.InterpolationMode = 'HighQualityBicubic'
      $g.PixelOffsetMode = 'HighQuality'

      $circle = New-Object System.Drawing.Drawing2D.GraphicsPath
      $circle.AddEllipse(0, 0, $size, $size)
      $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
        New-Object System.Drawing.Point 0, 0),
        (New-Object System.Drawing.Point $size, $size), $c1, $c2
      $g.FillPath($bg, $circle)
      $g.SetClip($circle)

      # 70% of the canvas: even the square corners stay inside the circle.
      $inset = [int]($size * 0.15)
      $area = $size - 2 * $inset
      $dstRect = New-Object System.Drawing.Rectangle $inset, $inset, $area, $area
      $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

      $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White),
        ([Math]::Max(1, [int]($size * 0.018)))
      $g.DrawRectangle($pen, $inset, $inset, $area, $area)
      $g.ResetClip()

      $edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::White),
        ([Math]::Max(1, [int]($size * 0.02)))
      $g.DrawEllipse($edge, ($edge.Width / 2.0), ($edge.Width / 2.0),
                     ($size - $edge.Width), ($size - $edge.Width))
    } finally {
      $g.Dispose()
    }
    $bmp.Save((Join-Path $iconsDir $spec.n), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ('generated ' + $spec.n)
  }

  # --- maskable icon: full-bleed gradient + 56% inset image (safe zone) ---
  $size = 512
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode = 'HighQuality'

    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
      New-Object System.Drawing.Point 0, 0),
      (New-Object System.Drawing.Point $size, $size), $c1, $c2
    $g.FillRectangle($bg, 0, 0, $size, $size)

    $inset = [int]($size * 0.22)
    $area = $size - 2 * $inset
    $dstRect = New-Object System.Drawing.Rectangle $inset, $inset, $area, $area
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 6
    $g.DrawRectangle($pen, $inset, $inset, $area, $area)
  } finally {
    $g.Dispose()
  }
  $bmp.Save((Join-Path $iconsDir 'icon-maskable-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host 'generated icon-maskable-512.png'

} finally {
  $img.Dispose()
}

& (Join-Path $PSScriptRoot 'make-launcher-icons.ps1')
Write-Host 'avatar icons done'
