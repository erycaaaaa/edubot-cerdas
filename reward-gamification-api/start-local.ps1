$ErrorActionPreference = 'Stop'
$rewardPython = Join-Path $PSScriptRoot '.venv-local\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $rewardPython)) {
    throw 'Environment belum tersedia. Jalankan: python -m venv .venv-local, lalu .\.venv-local\Scripts\python.exe -m pip install -r requirements.txt dari folder reward-gamification-api.'
}
& $rewardPython -m uvicorn reward_api:app --app-dir $PSScriptRoot --host 127.0.0.1 --port 8002
exit $LASTEXITCODE
