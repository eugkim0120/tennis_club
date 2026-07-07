@echo off
cd /d "%~dp0"
echo Starting TennisMatch dev server...
echo.
npm run dev
echo.
echo Server stopped. Press any key to close.
pause >nul
