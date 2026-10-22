
$ErrorActionPreference = "Stop"

$Root = "C:\HomeGuide"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"

Write-Host "`n=== HOMEGUIDE STARTUP ===" -ForegroundColor Cyan

# Verify project folders and Python environment.
foreach ($Path in @($Backend, $Frontend, $Python)) {
    if (-not (Test-Path $Path)) {
        throw "Required path not found: $Path"
    }
}

# Verify Ollama and the required local model.
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    throw "Ollama is not installed or is missing from PATH."
}

$Models = ollama list | Out-String
if ($Models -notmatch "qwen2\.5:3b") {
    throw "Qwen model missing. Run: ollama pull qwen2.5:3b"
}

# Check that Ollama responds.
try {
    $null = Invoke-RestMethod `
        -Uri "http://127.0.0.1:11434/api/tags" `
        -TimeoutSec 5
} catch {
    throw "Ollama is not responding. Start Ollama, then run this script again."
}

# Verify frontend dependencies.
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    throw "Frontend dependencies are missing. Run npm install in C:\HomeGuide\frontend."
}

Write-Host "Preflight checks passed." -ForegroundColor Green

# Start FastAPI backend.
Start-Process powershell.exe -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Backend'; & '$Python' -m uvicorn app.main:app --reload --port 8000"
)

Start-Sleep -Seconds 2

# Start MCP server.
Start-Process powershell.exe -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Backend'; & '$Python' -m app.mcp_server"
)

# Start Vite frontend.
Start-Process powershell.exe -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Frontend'; npm run dev -- --host 127.0.0.1"
)

Write-Host "`nStartup commands launched." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://127.0.0.1:8000/docs"
Write-Host "MCP:      http://127.0.0.1:8001/mcp"
Write-Host "`nWait for all three services to finish starting."
Write-Host "If port 8000 or 8001 is already occupied, stop the old instance first."
