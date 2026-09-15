$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$remoteUrl = Read-Host "Remote model backend URL (for example https://your-model-device.example.com)"
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
    throw "A remote model backend URL is required."
}

$env:MODEL_BACKEND_URL = $remoteUrl.TrimEnd('/')
Write-Host "Starting lightweight relay on http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "This machine will not load PyTorch or model weights." -ForegroundColor Cyan
py run_backend.py
