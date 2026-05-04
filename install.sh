#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  OpenDesktop Installer — One-line install for any platform
# ═══════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${RED}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${RED}  ║${NC}     ${BOLD}⚡ OpenDesktop Installer ⚡${NC}            ${RED}║${NC}"
echo -e "${RED}  ║${NC}     ${CYAN}AI Desktop Agent${NC}                       ${RED}║${NC}"
echo -e "${RED}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM="linux";;
    Darwin*)    PLATFORM="macos";;
    CYGWIN*|MINGW*|MSYS*) PLATFORM="windows";;
    *)          PLATFORM="unknown";;
esac

echo -e "${CYAN}  📟 Detected platform: ${BOLD}${PLATFORM}${NC}"

# Check Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            echo -e "${GREEN}  ✅ Node.js $(node -v) found${NC}"
            return 0
        else
            echo -e "${YELLOW}  ⚠️  Node.js $(node -v) found but v18+ required${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}  ⚠️  Node.js not found${NC}"
        return 1
    fi
}

install_node() {
    echo -e "${CYAN}  📦 Installing Node.js...${NC}"
    if [ "$PLATFORM" = "macos" ]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo -e "${RED}  ❌ Please install Homebrew first: https://brew.sh${NC}"
            exit 1
        fi
    elif [ "$PLATFORM" = "linux" ]; then
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y nodejs
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm nodejs npm
        elif command -v apk &> /dev/null; then
            sudo apk add nodejs npm
        else
            echo -e "${RED}  ❌ Could not install Node.js. Please install manually: https://nodejs.org${NC}"
            exit 1
        fi
    else
        echo -e "${RED}  ❌ Please install Node.js 18+ from https://nodejs.org${NC}"
        exit 1
    fi
}

if ! check_node; then
    install_node
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}  ❌ npm not found. Please install Node.js from https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}  ✅ npm $(npm -v) found${NC}"
echo ""

# Install OpenDesktop
echo -e "${CYAN}  📦 Installing OpenDesktop globally...${NC}"
npm install -g opendesktop-ai 2>/dev/null || {
    echo -e "${YELLOW}  ⚠️  Global install failed, trying with sudo...${NC}"
    sudo npm install -g opendesktop-ai
}

echo ""
echo -e "${GREEN}  ✅ OpenDesktop installed successfully! 🎉${NC}"
echo ""
echo -e "${RED}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${RED}  ║${NC}  ${BOLD}Quick Start:${NC}                              ${RED}║${NC}"
echo -e "${RED}  ║${NC}                                            ${RED}║${NC}"
echo -e "${RED}  ║${NC}  ${CYAN}opendesktop${NC}        → Setup & Chat       ${RED}║${NC}"
echo -e "${RED}  ║${NC}  ${CYAN}opendesktop --gui${NC}  → GUI Interface       ${RED}║${NC}"
echo -e "${RED}  ║${NC}  ${CYAN}opendesktop --setup${NC}→ Re-run Setup        ${RED}║${NC}"
echo -e "${RED}  ║${NC}  ${CYAN}od${NC}                → Short Alias          ${RED}║${NC}"
echo -e "${RED}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# Run setup
echo -e "${CYAN}  🔧 Launching setup wizard...${NC}"
echo ""
opendesktop --setup || od --setup || node "$(npm root -g)/opendesktop/src/cli/setup.js"
