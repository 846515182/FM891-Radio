# 生成 FM891 应用图标（192 / 512 PNG，含 maskable 版本）
# 用法：右键此文件 “使用 PowerShell 运行”，或执行  .\make-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot 'icons'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function New-FmIcon {
  param([int]$Size, [string]$Path)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.PixelOffsetMode = 'HighQuality'

  # 背景渐变（紫 -> 粉）
  $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $c1 = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
  $c2 = [System.Drawing.Color]::FromArgb(255, 236, 72, 152)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, ([float]45)
  $g.FillRectangle($grad, $rect)

  # 白色装饰圆环
  $penW = [math]::Max(2, [int]($Size * 0.012))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)), ([float]$penW)
  $pad = $Size * 0.09
  $g.DrawEllipse($pen, $pad, $pad, ($Size - 2 * $pad), ($Size - 2 * $pad))

  $white = [System.Drawing.Brushes]::White
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'

  $fontBig = New-Object System.Drawing.Font('Segoe UI', ([float]($Size * 0.21)), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontSm = New-Object System.Drawing.Font('Microsoft YaHei', ([float]($Size * 0.072)), [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

  $r1 = New-Object System.Drawing.RectangleF ([float]0), ([float]($Size * 0.16)), ([float]$Size), ([float]($Size * 0.4))
  $g.DrawString('FM891', $fontBig, $white, $r1, $sf)

  $r2 = New-Object System.Drawing.RectangleF ([float]0), ([float]($Size * 0.58)), ([float]$Size), ([float]($Size * 0.24))
  $g.DrawString('音乐电台', $fontSm, $white, $r2, $sf)

  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "已生成 $Path"
}

New-FmIcon -Size 192 -Path (Join-Path $outDir 'icon-192.png')
New-FmIcon -Size 512 -Path (Join-Path $outDir 'icon-512.png')
New-FmIcon -Size 512 -Path (Join-Path $outDir 'icon-maskable-512.png')
Write-Host '图标全部生成完毕。'
