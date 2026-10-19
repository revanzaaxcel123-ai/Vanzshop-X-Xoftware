param([Parameter(Mandatory=$true)][string]$Destination)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$botPackageRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$botArchivePath = [System.IO.Path]::GetFullPath($Destination)
if (-not $botArchivePath.EndsWith('.zip', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Destination harus file ZIP.' }
$botPackageFiles = @()
foreach ($botPackageDirectory in @('src', 'scripts', 'tests', 'backend')) {
  $botDirectoryPath = Join-Path $botPackageRoot $botPackageDirectory
  if (Test-Path -LiteralPath $botDirectoryPath) {
    $botPackageFiles += Get-ChildItem -LiteralPath $botDirectoryPath -File -Recurse
  }
}
foreach ($botPackageName in @('package.json', 'package-lock.json', '.env.example', '.gitignore', 'README.md', 'MIGRASI.md', 'DIAGNOSIS-2026-10-04.md', 'banner.png')) {
  $botFilePath = Join-Path $botPackageRoot $botPackageName
  if (Test-Path -LiteralPath $botFilePath) { $botPackageFiles += Get-Item -LiteralPath $botFilePath }
}
# Explicit source allowlist excludes .env, auth, customer receipts and dependencies.
$botArchive = [System.IO.Compression.ZipArchive]::new([System.IO.File]::Open($botArchivePath, [System.IO.FileMode]::Create), [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($botPackageFile in $botPackageFiles) {
    $botEntryName = $botPackageFile.FullName.Substring($botPackageRoot.Length + 1).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($botArchive, $botPackageFile.FullName, $botEntryName)
  }
} finally { $botArchive.Dispose() }
Write-Output "Paket bot dibuat: $botArchivePath ($($botPackageFiles.Count) file; tanpa auth/.env/data pelanggan)."
