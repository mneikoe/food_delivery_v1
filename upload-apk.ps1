# PowerShell Script to Upload APK to Production Server
# Usage: .\upload-apk.ps1

Write-Host "🚀 APK Upload to Production Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LocalAPK = "D:\food_delivery_v1\client\android\app\build\outputs\apk\release\app-release.apk"
$ServerUser = "your_username"  # Change this
$ServerHost = "www.chatoraadda.in"
$ServerPath = "/path/to/server/uploads/"  # Change this

# Check if APK exists
if (-not (Test-Path $LocalAPK)) {
    Write-Host "❌ Error: APK file not found at $LocalAPK" -ForegroundColor Red
    exit 1
}

$APKSize = (Get-Item $LocalAPK).Length / 1MB
Write-Host "📱 APK File: app-release.apk" -ForegroundColor Green
Write-Host "📏 APK Size: $([math]::Round($APKSize, 2)) MB" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Use one of these methods to upload:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Method 1: Admin Panel (Recommended)" -ForegroundColor Cyan
Write-Host "  1. Go to: https://www.chatoraadda.in/admin/login"
Write-Host "  2. Login"
Write-Host "  3. Click 'App Settings'"
Write-Host "  4. Upload APK file"
Write-Host ""
Write-Host "Method 2: SCP Command" -ForegroundColor Cyan
Write-Host "  scp `"$LocalAPK`" ${ServerUser}@${ServerHost}:${ServerPath}app-release.apk"
Write-Host ""
Write-Host "Method 3: FileZilla/WinSCP" -ForegroundColor Cyan
Write-Host "  Host: $ServerHost"
Write-Host "  Local: $LocalAPK"
Write-Host "  Remote: ${ServerPath}app-release.apk"
Write-Host ""

Read-Host "Press Enter to open APK folder"
explorer (Split-Path $LocalAPK)
