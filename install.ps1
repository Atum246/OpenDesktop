# OpenDesktop Windows Installer
# Usage: powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.ps1 | iex"

$ErrorActionPreference = "Stop"

# ─── Colors ───
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Write-Banner {
    Write-Host ""
    Write-Color "  ██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ███████╗███████╗██╗  ██╗████████╗" "Green"
    Write-Color "  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██╔════╝██║ ██╔╝╚══██╔══╝" "Green"
    Write-Color "  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ███████╗█████╔╝    ██║   " "Green"
    Write-Color "  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ╚════██║██╔═██╗    ██║   " "Green"
    Write-Color "  ╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝███████╗███████║██║  ██╗   ██║   " "Green"
    Write-Color "   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   " "Green"
    Write-Host ""
    Write-Color "  NOT A CHATBOT. AN INTELLIGENCE AGENT." "Yellow"
    Write-Host ""
}

# ─── Pre-flight checks ───
function Test-Prerequisites {
    Write-Color "[1/6] Checking prerequisites..." "Cyan"

    # Check Windows version
    $os = Get-CimInstance Win32_OperatingSystem
    $version = [version]$os.Version
    if ($version.Major -lt 10) {
        Write-Color "  ERROR: Windows 10 or later required. You have: $($os.Caption)" "Red"
        exit 1
    }
    Write-Color "  OS: $($os.Caption) ✓" "Green"

    # Check architecture
    $arch = $env:PROCESSOR_ARCHITECTURE
    Write-Color "  Architecture: $arch ✓" "Green"

    return $true
}

# ─── Install Node.js ───
function Install-NodeJS {
    Write-Color "[2/6] Checking Node.js..." "Cyan"

    # Check if node is already installed
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if ($nodePath) {
        $nodeVersion = & node --version 2>$null
        Write-Color "  Node.js $nodeVersion found ✓" "Green"

        # Check if version is >= 18
        $ver = $nodeVersion -replace 'v', ''
        $major = [int]($ver.Split('.')[0])
        if ($major -lt 18) {
            Write-Color "  Node.js v18+ required. Upgrading..." "Yellow"
            Install-NodeJS-FromWeb
        }
        return
    }

    Write-Color "  Node.js not found. Installing..." "Yellow"
    Install-NodeJS-FromWeb
}

function Install-NodeJS-FromWeb {
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "AMD64") { "x64" } else { "x86" }
    $nodeVersion = "v20.11.1"
    $nodeUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-$arch.msi"
    $nodeMsi = "$env:TEMP\node-install.msi"

    Write-Color "  Downloading Node.js $nodeVersion ($arch)..." "Yellow"
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
    } catch {
        Write-Color "  Download failed. Trying alternative method..." "Yellow"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        (New-Object System.Net.WebClient).DownloadFile($nodeUrl, $nodeMsi)
    }

    Write-Color "  Installing Node.js (this may take a minute)..." "Yellow"
    $process = Start-Process msiexec.exe -ArgumentList "/i", $nodeMsi, "/quiet", "/norestart" -Wait -PassThru
    
    if ($process.ExitCode -ne 0) {
        Write-Color "  MSI install failed. Trying winget..." "Yellow"
        try {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        } catch {
            Write-Color "  ERROR: Could not install Node.js automatically." "Red"
            Write-Color "  Please install manually from: https://nodejs.org" "Yellow"
            Write-Color "  Then re-run this installer." "Yellow"
            exit 1
        }
    }

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Verify
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        Write-Color "  Node.js installed: $(node --version) ✓" "Green"
    } else {
        Write-Color "  WARNING: Node.js installed but not in PATH." "Yellow"
        Write-Color "  Please restart your terminal and run: opendesktop --setup" "Yellow"
        exit 1
    }

    # Clean up
    Remove-Item $nodeMsi -ErrorAction SilentlyContinue
}

# ─── Install npm (comes with Node, but verify) ───
function Install-Npm {
    Write-Color "[3/6] Checking npm..." "Cyan"

    $npmPath = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmPath) {
        $npmVersion = & npm --version 2>$null
        Write-Color "  npm $npmVersion found ✓" "Green"
        return
    }

    Write-Color "  npm not found (should come with Node.js)" "Yellow"
    Write-Color "  Refreshing PATH..." "Yellow"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    $npmPath = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmPath) {
        Write-Color "  ERROR: npm not found after Node.js install." "Red"
        Write-Color "  Please restart your terminal and re-run this installer." "Yellow"
        exit 1
    }
    Write-Color "  npm found ✓" "Green"
}

# ─── Install OpenDesktop ───
function Install-OpenDesktop {
    Write-Color "[4/6] Installing OpenDesktop..." "Cyan"

    # Refresh PATH to pick up npm
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Check for existing install
    $existing = Get-Command opendesktop -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Color "  Existing installation found. Updating..." "Yellow"
        & npm update -g opendesktop-ai 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Color "  Updated successfully ✓" "Green"
            return
        }
        Write-Color "  Update failed. Reinstalling..." "Yellow"
        & npm uninstall -g opendesktop-ai 2>$null
    }

    # Install globally
    Write-Color "  Installing opendesktop-ai via npm..." "Yellow"
    & npm install -g opendesktop-ai

    if ($LASTEXITCODE -ne 0) {
        Write-Color "  npm install failed. Trying with --force..." "Yellow"
        & npm install -g opendesktop-ai --force
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Color "  ERROR: Installation failed." "Red"
        Write-Color "  Try running PowerShell as Administrator and re-run." "Yellow"
        exit 1
    }

    Write-Color "  OpenDesktop installed ✓" "Green"
}

# ─── Verify installation ───
function Test-Installation {
    Write-Color "[5/6] Verifying installation..." "Cyan"

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Also check common npm global paths
    $npmGlobalPaths = @(
        "$env:APPDATA\npm",
        "$env:USERPROFILE\AppData\Roaming\npm",
        "C:\Program Files\nodejs"
    )
    foreach ($p in $npmGlobalPaths) {
        if (Test-Path $p) {
            $env:Path = "$p;$env:Path"
        }
    }

    $od = Get-Command opendesktop -ErrorAction SilentlyContinue
    if (-not $od) {
        # Try the short alias
        $od = Get-Command od -ErrorAction SilentlyContinue
    }

    if ($od) {
        $version = & opendesktop --version 2>$null
        if (-not $version) { $version = "installed" }
        Write-Color "  opendesktop command available ✓" "Green"
        Write-Color "  Version: $version" "Green"
    } else {
        Write-Color "  WARNING: opendesktop command not found in PATH." "Yellow"
        Write-Color "  You may need to restart your terminal." "Yellow"
        Write-Color "  After restart, run: opendesktop --setup" "Yellow"
        return $false
    }

    return $true
}

# ─── Run setup ───
function Start-Setup {
    Write-Color "[6/6] Running setup..." "Cyan"
    Write-Host ""

    $runSetup = Read-Host "  Run setup wizard now? (Y/n)"
    if ($runSetup -eq "" -or $runSetup -eq "Y" -or $runSetup -eq "y") {
        & opendesktop --setup
    } else {
        Write-Host ""
        Write-Color "  To setup later, run: opendesktop --setup" "Yellow"
        Write-Color "  To start chatting, run: opendesktop" "Yellow"
        Write-Color "  Short alias: od" "Yellow"
    }
}

# ─── Main ───
function Main {
    Clear-Host
    Write-Banner

    try {
        Test-Prerequisites
        Install-NodeJS
        Install-Npm
        Install-OpenDesktop
        $verified = Test-Installation

        Write-Host ""
        Write-Color "  ═══════════════════════════════════════════════" "Green"
        Write-Color "  Installation complete!" "Green"
        Write-Color "  ═══════════════════════════════════════════════" "Green"
        Write-Host ""

        if ($verified) {
            Start-Setup
        } else {
            Write-Color "  Restart your terminal, then run:" "Yellow"
            Write-Color "    opendesktop --setup" "White"
        }

        Write-Host ""
        Write-Color "  Quick commands:" "Cyan"
        Write-Color "    opendesktop          Start chatting" "White"
        Write-Color "    od                   Short alias" "White"
        Write-Color "    opendesktop --gui    Launch GUI" "White"
        Write-Color "    opendesktop --help   Show all options" "White"
        Write-Host ""

    } catch {
        Write-Host ""
        Write-Color "  ERROR: $($_.Exception.Message)" "Red"
        Write-Color "  Please report this at: https://github.com/Atum246/OpenDesktop/issues" "Yellow"
        Write-Host ""
        exit 1
    }
}

Main
