@echo off
setlocal EnableDelayedExpansion

:: OpenDesktop Windows Installer
:: Usage: curl -o install.bat https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.bat && install.bat
:: Or:    powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.ps1 | iex"

title OpenDesktop Installer
color 0A

echo.
echo   ██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ███████╗███████╗██╗  ██╗████████╗
echo   ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██╔════╝██║ ██╔╝╚══██╔══╝
echo   ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ███████╗█████╔╝    ██║
echo   ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ╚════██║██╔═██╗    ██║
echo   ╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝███████╗███████║██║  ██╗   ██║
echo    ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝
echo.
echo   NOT A CHATBOT. AN INTELLIGENCE AGENT.
echo.

:: ─── Check for Node.js ───
echo [1/5] Checking for Node.js...
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo   Node.js !NODE_VER! found.
    goto :check_npm
)

echo   Node.js not found.
echo.
echo   Attempting to install Node.js...
echo.

:: Try winget first (Windows 10 1709+)
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Installing via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo   Node.js installed via winget.
        goto :refresh_path
    )
)

:: Try chocolatey
where choco >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Installing via Chocolatey...
    choco install nodejs-lts -y
    if %ERRORLEVEL% EQU 0 (
        echo   Node.js installed via Chocolatey.
        goto :refresh_path
    )
)

:: Try scoop
where scoop >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Installing via Scoop...
    scoop install nodejs-lts
    if %ERRORLEVEL% EQU 0 (
        echo   Node.js installed via Scoop.
        goto :refresh_path
    )
)

:: Manual instructions
echo.
echo   ═══════════════════════════════════════════════
echo   Could not install Node.js automatically.
echo   ═══════════════════════════════════════════════
echo.
echo   Please install Node.js manually:
echo.
echo   Option 1: Download from https://nodejs.org
echo             (LTS version recommended)
echo.
echo   Option 2: Install winget, then re-run this script
echo             https://aka.ms/getwinget
echo.
echo   Option 3: Install via PowerShell:
echo             winget install OpenJS.NodeJS.LTS
echo.
echo   After installing Node.js, restart your terminal
echo   and re-run this installer.
echo.
pause
exit /b 1

:refresh_path
:: Refresh PATH to pick up Node.js
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   Node.js installed but not in PATH.
    echo   Please restart your terminal and re-run this installer.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo   Node.js !NODE_VER! confirmed.

:check_npm
:: ─── Check for npm ───
echo [2/5] Checking for npm...
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
    echo   npm !NPM_VER! found.
    goto :install_od
)

echo   npm not found (should come with Node.js).
echo   Refreshing PATH...
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: npm not found. Please restart terminal and re-run.
    pause
    exit /b 1
)

:install_od
:: ─── Install OpenDesktop ───
echo [3/5] Installing OpenDesktop...
set "PATH=%PATH%;%APPDATA%\npm"

:: Check for existing install
where opendesktop >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Existing installation found. Updating...
    call npm update -g opendesktop-ai
    if %ERRORLEVEL% EQU 0 (
        echo   Updated successfully.
        goto :verify
    )
    echo   Update failed. Reinstalling...
    call npm uninstall -g opendesktop-ai
)

call npm install -g opendesktop-ai
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   npm install failed. Trying with --force...
    call npm install -g opendesktop-ai --force
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   ERROR: Installation failed.
    echo   Try running Command Prompt as Administrator.
    echo.
    pause
    exit /b 1
)

echo   OpenDesktop installed.

:verify
:: ─── Verify ───
echo [4/5] Verifying installation...
set "PATH=%PATH%;%APPDATA%\npm"

where opendesktop >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   opendesktop command available.
) else (
    where od >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   od command available.
    ) else (
        echo.
        echo   WARNING: Command not found in PATH.
        echo   You may need to restart your terminal.
        echo   After restart, run: opendesktop --setup
        echo.
        pause
        exit /b 0
    )
)

:: ─── Setup ───
echo [5/5] Setup complete!
echo.
echo   ═══════════════════════════════════════════════
echo   Installation complete!
echo   ═══════════════════════════════════════════════
echo.
echo   Quick commands:
echo     opendesktop          Start chatting
echo     od                   Short alias
echo     opendesktop --gui    Launch GUI
echo     opendesktop --setup  Run setup wizard
echo     opendesktop --help   Show all options
echo.

set /p "RUN_SETUP=Run setup wizard now? (Y/n): "
if /i "!RUN_SETUP!"=="" goto :run_setup
if /i "!RUN_SETUP!"=="Y" goto :run_setup
if /i "!RUN_SETUP!"=="y" goto :run_setup
echo.
echo   To setup later, run: opendesktop --setup
echo.
pause
exit /b 0

:run_setup
echo.
call opendesktop --setup
echo.
pause
exit /b 0
