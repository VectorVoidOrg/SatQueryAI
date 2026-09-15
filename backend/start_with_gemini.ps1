$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

Write-Host "SatQuery AI backend setup" -ForegroundColor Cyan
Write-Host "Paste the Gemini API key when prompted. It will be used only by this process and will not be saved to disk." -ForegroundColor Yellow
$secureKey = Read-Host "Gemini API key" -AsSecureString
$keyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPtr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPtr)
}

Write-Host "Installing/verifying Gemini SDK..." -ForegroundColor Cyan
py -m pip install "google-genai>=1.0.0"

Write-Host "Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
py run_backend.py
