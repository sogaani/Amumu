@echo off

rem
rem 10秒後にamumu_encoderをPowershellで実行する
rem

pushd "D:\program\Amumu"

timeout 10

start "app" "%SystemRoot%\system32\WindowsPowerShell\v1.0\powershell.exe" "npm run encoder"

exit