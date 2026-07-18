# ==============================================================================
# Emscripten SDK Activation Script (PowerShell)
#
# NOTE: To apply environment variables to your current session, execute it as:
#
#   . .\active_emsdk.ps1
# ==============================================================================

$EMSDK_DIR = ""

# 1. Check env variable
if ($env:EMSDK -and (Test-Path $env:EMSDK)) {
    $EMSDK_DIR = $env:EMSDK
}

# 2. Check direct folders
if (-not $EMSDK_DIR) {
    $username = [System.Environment]::UserName
    $search_dirs = @(
        "$HOME\emsdk",
        "C:\Users\$username\emsdk",
        "C:\emsdk"
    )
    foreach ($dir in $search_dirs) {
        if (Test-Path $dir) {
            $EMSDK_DIR = $dir
            break
        }
    }
}

# 3. Dynamic search fallback in HOME up to depth of 2
if (-not $EMSDK_DIR) {
    Write-Host "Locating emsdk directory dynamically..." -ForegroundColor Yellow
    $found = Get-ChildItem -Path $HOME -Depth 2 -Filter "emsdk" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $EMSDK_DIR = $found.FullName
    }
}

if ($EMSDK_DIR -and (Test-Path $EMSDK_DIR)) {
    Write-Host "Found emsdk at: $EMSDK_DIR" -ForegroundColor Green
    
    $ORIG_DIR = Get-Location
    Set-Location $EMSDK_DIR
    
    if (Test-Path ".\emsdk_env.ps1") {
        . .\emsdk_env.ps1
        Write-Host "Emscripten SDK environment successfully loaded." -ForegroundColor Green
    } else {
        Write-Warning "Error: emsdk_env.ps1 not found inside $EMSDK_DIR"
    }
    
    Set-Location $ORIG_DIR
} else {
    Write-Warning "Error: emsdk directory could not be located on your machine."
}
