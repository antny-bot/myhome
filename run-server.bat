@echo off
setlocal

cd /d "%~dp0"

call npm run dev
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Dev server exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
