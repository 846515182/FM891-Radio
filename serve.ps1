# FM891 本地预览服务器
# 用法：.\serve.ps1   然后浏览器打开 http://localhost:8080
$port = 8080
$root = $PSScriptRoot

$mime = @{
  '.html'       = 'text/html; charset=utf-8'
  '.css'        = 'text/css; charset=utf-8'
  '.js'         = 'application/javascript; charset=utf-8'
  '.json'       = 'application/json; charset=utf-8'
  '.webmanifest'= 'application/manifest+json'
  '.png'        = 'image/png'
  '.svg'        = 'image/svg+xml'
  '.ico'        = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
[void]$listener.Prefixes.Add("http://localhost:$port/")
try {
  $listener.Start()
} catch {
  Write-Error "端口 $port 启动失败：$($_.Exception.Message)"
  exit 1
}

Write-Host "FM891 本地服务已启动： http://localhost:$port  （Ctrl+C 停止）"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = $ctx.Request.Url.LocalPath
    if ($rel -eq '/') { $rel = '/index.html' }
    $file = Join-Path $root ($rel.TrimStart('/'))

    if ((Test-Path $file -PathType Leaf) -and $file.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $ctx.Response.StatusCode = 404
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch {
    # 单个请求出错不影响服务
  }
}
