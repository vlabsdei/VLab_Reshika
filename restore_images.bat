@echo off
echo Restoring original image files from GitHub repository...
git checkout origin/main -- "*images*"
echo All original PNG images restored into their experiment folders!
