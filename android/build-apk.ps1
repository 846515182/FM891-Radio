# FM891 Android APK builder (no Gradle, no Android Studio)
# Prereqs: Temurin JDK 17 + C:\android-tools (cmdline-tools, platforms;android-34, build-tools;34.0.0)
# Usage:   .\build-apk.ps1
$ErrorActionPreference = 'Stop'

$androidDir = $PSScriptRoot
$webRoot = Split-Path -Parent $androidDir
$sdkRoot = 'C:\android-tools'
$bt = Join-Path $sdkRoot 'build-tools\34.0.0'
$platform = Join-Path $sdkRoot 'platforms\android-34\android.jar'
$build = Join-Path $androidDir 'build'

# ---- 1. locate JDK ----
$javaExe = $null
$adoptium = 'C:\Program Files\Eclipse Adoptium'
if (Test-Path $adoptium) {
  $javaExe = Get-ChildItem $adoptium -Recurse -Filter java.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match 'bin\\java\.exe$' } | Select-Object -First 1
  if ($javaExe) { $javaExe = $javaExe.FullName }
}
if (-not $javaExe) {
  $cmd = Get-Command java -ErrorAction SilentlyContinue
  if ($cmd) { $javaExe = $cmd.Source }
}
if (-not $javaExe) { throw 'Java not found. Install Temurin JDK 17 first (winget install EclipseAdoptium.Temurin.JDK.17).' }
$jdkBin = Split-Path -Parent $javaExe
$env:Path = $jdkBin + ';' + $env:Path
Write-Host ('JAVA: ' + $javaExe)

if (-not (Test-Path $bt)) { throw "build-tools missing: $bt (run sdkmanager install first)" }
if (-not (Test-Path $platform)) { throw "android.jar missing: $platform (run sdkmanager install first)" }

# ---- 2. stage web assets into the APK ----
$assets = Join-Path $androidDir 'assets'
if (Test-Path $assets) { Remove-Item $assets -Recurse -Force }
New-Item -ItemType Directory -Force -Path $assets | Out-Null
foreach ($f in @('index.html', 'style.css', 'app.js', 'mqtt.min.js', 'manifest.json', 'sw.js')) {
  Copy-Item (Join-Path $webRoot $f) (Join-Path $assets $f)
}
Copy-Item (Join-Path $webRoot 'icons') (Join-Path $assets 'icons') -Recurse
Write-Host 'assets staged'

# ---- 3. compile + link resources ----
if (Test-Path $build) { Remove-Item $build -Recurse -Force }
New-Item -ItemType Directory -Force -Path $build | Out-Null
& "$bt\aapt2.exe" compile --dir (Join-Path $androidDir 'res') -o (Join-Path $build 'res.zip')
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile failed' }

$baseApk = Join-Path $build 'base.apk'
& "$bt\aapt2.exe" link -o $baseApk -I $platform `
  --manifest (Join-Path $androidDir 'AndroidManifest.xml') `
  -R (Join-Path $build 'res.zip') `
  --min-sdk-version 21 --target-sdk-version 34 --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link failed' }

# Inject web assets with forward-slash entry names.
# (aapt2 -A on Windows stores subdirectory entries with backslashes,
#  which Android's AssetManager cannot resolve.)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipArch = [System.IO.Compression.ZipFile]::Open($baseApk, 'Update')
try {
  Get-ChildItem $assets -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($assets.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArch, $_.FullName, ('assets/' + $rel)) | Out-Null
  }
} finally {
  $zipArch.Dispose()
}
Write-Host 'apk linked + assets injected'

# ---- 4. compile java ----
$classes = Join-Path $build 'classes'
New-Item -ItemType Directory -Force -Path $classes | Out-Null
$javaFiles = Get-ChildItem (Join-Path $androidDir 'src') -Recurse -Filter *.java | ForEach-Object { $_.FullName }
& javac -encoding UTF-8 -source 8 -target 8 -classpath $platform -d $classes $javaFiles
if ($LASTEXITCODE -ne 0) { throw 'javac failed' }

# ---- 5. dex + inject ----
$dex = Join-Path $build 'dex'
New-Item -ItemType Directory -Force -Path $dex | Out-Null
$jarTool = Join-Path $jdkBin 'jar.exe'
& $jarTool cf (Join-Path $build 'classes.jar') -C $classes .
if ($LASTEXITCODE -ne 0) { throw 'jar failed' }

& "$bt\d8.bat" --release --lib $platform --output $dex (Join-Path $build 'classes.jar')
if ($LASTEXITCODE -ne 0) { throw 'd8 failed' }

& $jarTool uf $baseApk -C $dex 'classes.dex'
if ($LASTEXITCODE -ne 0) { throw 'inject dex failed' }
Write-Host 'dex injected'

# ---- 6. zipalign ----
$aligned = Join-Path $build 'aligned.apk'
& "$bt\zipalign.exe" -f -p 4 $baseApk $aligned
if ($LASTEXITCODE -ne 0) { throw 'zipalign failed' }

# ---- 7. keystore (created once) ----
$ks = Join-Path $androidDir 'fm891.keystore'
if (-not (Test-Path $ks)) {
  & keytool -genkeypair -keystore $ks -alias fm891 -keyalg RSA -keysize 2048 `
    -validity 10000 -storepass fm891radio -keypass fm891radio `
    -dname 'CN=FM891, O=FM891, C=CN'
  if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }
}

# ---- 8. sign + verify ----
$final = Join-Path $build 'FM891.apk'
& "$bt\apksigner.bat" sign --ks $ks --ks-key-alias fm891 `
  --ks-pass 'pass:fm891radio' --key-pass 'pass:fm891radio' `
  --out $final $aligned
if ($LASTEXITCODE -ne 0) { throw 'apksigner failed' }
& "$bt\apksigner.bat" verify $final
if ($LASTEXITCODE -ne 0) { throw 'apk verify failed' }

$out = Join-Path $webRoot 'FM891.apk'
Copy-Item $final $out -Force
$size = [math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host ('BUILD OK -> ' + $out + ' (' + $size + ' MB)')
