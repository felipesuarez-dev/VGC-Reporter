param(
    [Parameter(Mandatory = $true)]
    [string]$Tag,
    [string]$NotesFile = "",
    [string]$ApkPath = "",
    [switch]$SkipBuild,
    [switch]$SkipAndroid,
    [switch]$NoPublish
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Need([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) {
        throw "Falta $Label en $Path"
    }
}

if (-not $NotesFile) {
    $NotesFile = "docs/release-notes-$Tag.md"
}
Need $NotesFile "el archivo de notas"

Write-Step "Comprobando version y tag"
bun scripts/bump-version.ts --check --tag $Tag

$Local = Join-Path $env:LOCALAPPDATA "vgc-reporter"
$Jdk = Get-ChildItem (Join-Path $Local "tools\jdk") -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $Jdk) { throw "No encuentro el JDK en $Local\tools\jdk" }
$Sdk = Join-Path $Local "tools\android-sdk"
$Ndk = Join-Path $Sdk "ndk\25.2.9519653"
$BuildTools = Join-Path $Sdk "build-tools\36.0.0"
Need $Sdk "Android SDK"
Need $Ndk "Android NDK 25.2.9519653"
Need (Join-Path $BuildTools "apksigner.bat") "Android build-tools 36.0.0"

$env:JAVA_HOME = $Jdk.FullName
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
$env:NDK_HOME = $Ndk
$env:ANDROID_NDK_HOME = $Ndk
$env:PATH = "$($Jdk.FullName)\bin;$Sdk\platform-tools;$BuildTools;$env:PATH"

$UpdaterKey = Join-Path $Local "updater.key"
$UpdaterPassword = Join-Path $Local "updater-password.txt"
if (-not (Test-Path $UpdaterKey)) {
    throw "Falta la llave del updater en $UpdaterKey. Generala con: bun x tauri signer generate -w `"$UpdaterKey`""
}
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $UpdaterKey -Raw
if (Test-Path $UpdaterPassword) {
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = Get-Content $UpdaterPassword -Raw
}

$AndroidCfg = @{}
$AndroidCfgFile = Join-Path $Local "android-keystore.txt"
Need $AndroidCfgFile "la configuracion del keystore Android"
Get-Content $AndroidCfgFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $AndroidCfg[$matches[1].Trim()] = $matches[2].Trim()
    }
}
foreach ($Key in "ANDROID_KEYSTORE", "ANDROID_KEY_ALIAS", "ANDROID_KEYSTORE_PASSWORD") {
    if (-not $AndroidCfg[$Key]) { throw "Falta $Key en $AndroidCfgFile" }
}
Need $AndroidCfg["ANDROID_KEYSTORE"] "el keystore Android"

$Assets = Join-Path $env:TEMP "vgc-release-$Tag"
if (Test-Path $Assets) { Remove-Item -Recurse -Force $Assets }
New-Item -ItemType Directory -Force -Path $Assets | Out-Null

if (-not $SkipBuild) {
    Write-Step "Instalando dependencias"
    bun install --frozen-lockfile

    Write-Step "Compilando frontend"
    bun run --cwd frontend build

    Write-Step "Compilando MSI"
    bun run tauri:build -- --bundles msi

    if (-not $SkipAndroid) {
        Write-Step "Compilando APK Android"
        bun x tauri android build --apk

        $Unsigned = "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
        Need $Unsigned "el APK sin firmar"
        $Apk = Join-Path $Assets "VGC.Reporter_${Tag}_android.apk"

        Write-Step "Firmando APK"
        & (Join-Path $BuildTools "apksigner.bat") sign `
            --ks $AndroidCfg["ANDROID_KEYSTORE"] `
            --ks-key-alias $AndroidCfg["ANDROID_KEY_ALIAS"] `
            --ks-pass "pass:$($AndroidCfg['ANDROID_KEYSTORE_PASSWORD'])" `
            --key-pass "pass:$($AndroidCfg['ANDROID_KEYSTORE_PASSWORD'])" `
            --out $Apk `
            $Unsigned
        if ($LASTEXITCODE -ne 0) { throw "apksigner sign fallo" }

        & (Join-Path $BuildTools "apksigner.bat") verify --print-certs $Apk
        if ($LASTEXITCODE -ne 0) { throw "apksigner verify fallo" }
    }
}

if ($ApkPath) {
    Need $ApkPath "el APK indicado en -ApkPath"
    $Apk = Join-Path $Assets "VGC.Reporter_${Tag}_android.apk"
    Copy-Item $ApkPath $Apk -Force
}

if ((Test-Path $Assets) -and (Get-ChildItem $Assets -Filter "*_android.apk" -ErrorAction SilentlyContinue)) {
    $Apk = Get-ChildItem $Assets -Filter "*_android.apk" | Select-Object -First 1
    Write-Step "Firmando APK para el updater"
    bun x tauri signer sign -p $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD $Apk.FullName
    if ($LASTEXITCODE -ne 0) { throw "tauri signer sign fallo" }
}

Write-Step "Reuniendo assets"
$MsiDir = "src-tauri\target\release\bundle\msi"
$Version = [regex]::Match($Tag, '\d+\.\d+\.\d+').Value
$Msis = Get-ChildItem $MsiDir -Filter "*.msi" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$Version*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 2
if (-not $Msis) {
    $Msis = Get-ChildItem $MsiDir -Filter "*.msi" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 2
}
if (-not $Msis) { throw "No encuentro ningun MSI en $MsiDir" }

foreach ($Msi in $Msis) {
    $Name = $Msi.Name -replace ' ', '.'
    $Dest = Join-Path $Assets $Name
    Copy-Item $Msi.FullName $Dest -Force
    if (Test-Path "$($Msi.FullName).sig") {
        Copy-Item "$($Msi.FullName).sig" "$Dest.sig" -Force
    }
    else {
        Write-Step "Firmando $Name para el updater"
        bun x tauri signer sign -p $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD $Dest
        if ($LASTEXITCODE -ne 0) { throw "tauri signer sign fallo para $Name" }
    }
}

$Sigs = Join-Path $Assets "sigs"
New-Item -ItemType Directory -Force -Path $Sigs | Out-Null
Get-ChildItem $Assets -File -Filter "*.sig" | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $Sigs $_.Name) -Force
}

Write-Step "Generando latest.json"
python scripts/build_latest_json.py `
    --sigs-dir $Sigs `
    --tag $Tag `
    --body-file $NotesFile `
    --repo-url "https://github.com/felipesuarez-dev/VGC-Reporter" `
    --out (Join-Path $Assets "latest.json")
if ($LASTEXITCODE -ne 0) { throw "build_latest_json.py fallo" }
Remove-Item -Recurse -Force $Sigs

Write-Step "Creando/actualizando release draft"
$ReleaseExists = $false
try {
    gh release view $Tag *> $null
    $ReleaseExists = ($LASTEXITCODE -eq 0)
}
catch {
    $ReleaseExists = $false
}
if (-not $ReleaseExists) {
    gh release create $Tag --title "VGC Reporter $Tag" --notes-file $NotesFile --draft
    if ($LASTEXITCODE -ne 0) { throw "gh release create fallo" }
}
else {
    gh release edit $Tag --notes-file $NotesFile
    if ($LASTEXITCODE -ne 0) { throw "gh release edit fallo" }
}

Write-Step "Subiendo assets"
Get-ChildItem $Assets -File | ForEach-Object {
    Write-Host "  $($_.Name)"
    gh release upload $Tag $_.FullName --clobber
    if ($LASTEXITCODE -ne 0) { throw "gh release upload fallo para $($_.Name)" }
}

if (-not $NoPublish) {
    Write-Step "Publicando release"
    gh release edit $Tag --draft=false --latest
    if ($LASTEXITCODE -ne 0) { throw "gh release edit --draft=false fallo" }
}

Write-Step "Assets del release"
gh release view $Tag --json tagName,isDraft,assets --jq '{tag: .tagName, draft: .isDraft, assets: [.assets[].name]}'
