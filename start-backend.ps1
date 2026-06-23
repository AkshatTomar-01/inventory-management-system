Write-Host "Starting backend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
