@echo off
REM Import backend\schema.sql into MySQL (XAMPP) on Windows
REM Adjust MYSQL_EXE if mysql is not in PATH. Common XAMPP path: C:\xampp\mysql\bin\mysql.exe

set MYSQL_EXE=mysql
if not exist "%MYSQL_EXE%" (
  if exist "C:\\xampp\\mysql\\bin\\mysql.exe" (
    set MYSQL_EXE=C:\\xampp\\mysql\\bin\\mysql.exe
  )
)

echo Using %MYSQL_EXE%
echo Importing schema.sql into database "%DB_NAME%" (user: %DB_USER%)
%MYSQL_EXE% -u %DB_USER% -p%DB_PASSWORD% < schema.sql
if %errorlevel% neq 0 (
  echo Import failed. Try passing correct user/password or run phpMyAdmin and import schema.sql manually.
) else (
  echo Import completed.
)

pause
