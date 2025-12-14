@echo off
rem Script to sync original documentation from the source folder to Docusaurus docs folder

rem --- CONFIGURATION ---
rem Set the absolute path to your original documentation folder
set "SOURCE_DOCS_PATH=C:\Users\gensh\Downloads\New folder\base_chatbot\document-project"

rem Set the path to the Docusaurus docs folder (relative to this project's root)
set "DEST_DOCS_PATH=.\docs"

echo Syncing documentation from %SOURCE_DOCS_PATH% to %DEST_DOCS_PATH%...

rem Use robocopy for robustly mirroring the directory.
rem /E copies subdirectories, including empty ones.
rem /PURGE deletes destination files/directories that no longer exist in the source.
robocopy "%SOURCE_DOCS_PATH%" "%DEST_DOCS_PATH%" /E /PURGE

echo Sync complete.
