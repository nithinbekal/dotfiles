#Requires -RunAsAdministrator

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Status($msg) {
  Write-Host "* $msg" -ForegroundColor Yellow
}

Write-Status "Installing WSL2"
wsl --install

Write-Status "Adding Windows Defender exclusion for WSL2"
$wslPath = "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited*"
Add-MpPreference -ExclusionPath $wslPath

$apps = @(
  @{ Id = "wez.wezterm";        Name = "WezTerm" },
  @{ Id = "equalsraf.win32yank"; Name = "win32yank" },
  @{ Id = "Obsidian.Obsidian";  Name = "Obsidian" },
  @{ Id = "Anysphere.Cursor";    Name = "Cursor" },
  @{ Id = "ElementLabs.LMStudio"; Name = "LM Studio" }
)

foreach ($app in $apps) {
  Write-Status "Installing $($app.Name)"
  $installed = winget list --id $app.Id --exact --accept-source-agreements 2>$null |
    Select-String $app.Id
  if ($installed) {
    Write-Host "  $($app.Name) already installed, skipping"
  } else {
    winget install --id $app.Id --exact --silent --accept-source-agreements --accept-package-agreements
  }
}

Write-Status "Installing JetBrains Mono Nerd Font"

$fontName   = "JetBrainsMono"
$releaseUrl = "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip"
$tmpZip     = Join-Path $env:TEMP "JetBrainsMono.zip"
$tmpDir     = Join-Path $env:TEMP "JetBrainsMono"
$fontsDir   = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"

$alreadyInstalled = Get-ChildItem "$fontsDir" -Filter "*JetBrainsMono*" -ErrorAction SilentlyContinue
if ($alreadyInstalled) {
  Write-Host "  JetBrains Mono Nerd Font already installed, skipping"
} else {
  Invoke-WebRequest -Uri $releaseUrl -OutFile $tmpZip -UseBasicParsing
  Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

  $fontFiles = Get-ChildItem $tmpDir -Filter "JetBrainsMonoNerdFont-*.ttf"

  New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
  foreach ($font in $fontFiles) {
    Copy-Item $font.FullName $fontsDir -Force
    New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" `
      -Name "$($font.BaseName) (TrueType)" -Value "$fontsDir\$($font.Name)" `
      -Force | Out-Null
  }

  Remove-Item $tmpZip, $tmpDir -Recurse -Force
  Write-Host "  JetBrains Mono Nerd Font installed"
}

Write-Host ""
Write-Host "Done. Windows setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Reboot if WSL2 was just installed for the first time."
Write-Host "  2. Open the WSL2 Ubuntu terminal."
Write-Host "  3. Clone dotfiles and run ./install.sh"
Write-Host ""
