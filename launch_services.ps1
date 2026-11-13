# Stop any existing processes on port 8000 and 5173
$connections = Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    try {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    } catch {}
}

Start-Sleep -Seconds 1

# Launch Backend
$backend = Start-Process -FilePath "d:\MINE ARENA 1.0\backend\venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory "d:\MINE ARENA 1.0\backend" `
    -WindowStyle Hidden `
    -PassThru

# Launch Frontend
$frontend = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
    -ArgumentList "node_modules\vite\bin\vite.js", "--host", "0.0.0.0", "--port", "5173" `
    -WorkingDirectory "d:\MINE ARENA 1.0\frontend" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Started Backend PID: $($backend.Id)"
Write-Host "Started Frontend PID: $($frontend.Id)"

Start-Sleep -Seconds 3

# Verify ports
$active = Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue
$active | Select-Object LocalAddress, LocalPort, State, OwningProcess | Format-Table -AutoSize
