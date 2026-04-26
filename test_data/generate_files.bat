@echo off
setlocal enabledelayedexpansion

@rem Backup data.json

cd /d "%~dp0"

set "source=..\data.json"
set "filename=data"
set "extension=.json"
set /a count=1

:loop
if not exist "..\%filename%_%count%%extension%" (
    copy "%source%" "..\%filename%_%count%%extension%"
    echo Backup %source% to ..\%filename%_%count%%extension%
    goto :eof
)
set /a count+=1
goto :loop

:create_dirs

@rem Create directory with test files

set "files_dir=files"
set "base_filename=test note with a long long long long long long long long long long long long long long long long long long name longer than 124 bytes"
set "file_extension=.md"
set "files_count=1000"
set "dirs_count=10"
set /a file_count=1

rmdir /s /q "%files_dir%"
mkdir "%files_dir%"

echo Creating %dirs_count% directories in "%files_dir%" with %files_count% files in each directory

for /L %%i in (1,1,%dirs_count%) do (
    mkdir "!files_dir!\%%i"
    
    for /L %%j in (1,1,!files_count!) do (
      set full_filename="!base_filename!_!file_count!!file_extension!"
      echo test content > "!files_dir!\%%i\!full_filename!"
      set /a file_count+=1
    )
)






