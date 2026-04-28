@echo off
echo ========================================
echo TradePost - Dependency Installation
echo ========================================
echo.

echo Installing Backend Dependencies...
cd /d G:\Startup\Tradepost\backend
call npm install --legacy-peer-deps
echo Backend installation complete!
echo.

echo Installing Frontend Dependencies...
cd /d G:\Startup\Tradepost\mobile-app
call npm install --legacy-peer-deps
echo Frontend installation complete!
echo.

echo ========================================
echo ✅ All dependencies installed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Backend: npm run dev
echo 2. Mobile: npm start
echo.
pause
