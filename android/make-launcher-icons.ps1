# Generate Android launcher icons (res/mipmap-*/ic_launcher.png)
# from ../icons/icon-512.png. ASCII-only script (no BOM needed).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = Join-Path (Split-Path -Parent $PSScriptRoot) 'icons\icon-512.png'
if (-not (Test-Path $src)) { throw "source icon not found: $src" }

$densities = [ordered]@{
  'mipmap-mdpi'    = 48
  'mipmap-hdpi'    = 72
  'mipmap-xhdpi'   = 96
  'mipmap-xxhdpi'  = 144
  'mipmap-xxxhdpi' = 192
}

$res = Join-Path $PSScriptRoot 'res'
$img = [System.Drawing.Image]::FromFile($src)
try {
  foreach ($d in $densities.Keys) {
    $dir = Join-Path $res $d
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $size = [int]$densities[$d]
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.SmoothingMode = 'AntiAlias'
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    $out = Join-Path $dir 'ic_launcher.png'
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ('generated ' + $out)
  }
} finally {
  $img.Dispose()
}
Write-Host 'launcher icons done'
