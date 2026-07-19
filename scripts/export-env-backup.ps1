param(
  [string]$OutputPath = (Join-Path $env:USERPROFILE 'Downloads\wellneuro-env-backup.txt')
)

$keys = @(
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL',
  'SMTP_URL',
  'ANTHROPIC_API_KEY',
  'CLAUDE_MODEL',
  'WN_C5_ENABLED',
  'WN_ENABLE_CORPUS_CLINIQUE_V1',
  'WN_C5_CIQUAL_IMPORT_CONFIRMATION',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'SENTRY_TRACES_SAMPLE_RATE',
  'NEXT_PUBLIC_APP_VERSION',
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_SHA',
  'NEXT_RUNTIME',
  'PLAYWRIGHT_BASE_URL',
  'PLAYWRIGHT_WEB_SERVER',
  'MIGRATE_DATABASE_URL'
)

function Get-EnvValue {
  param([string]$Name)

  $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($Name, 'User')
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($Name, 'Machine')
  }
  return $value
}

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory -and -not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$lines = @()
$lines += '# Wellneuro env backup'
$lines += '# Generated: ' + (Get-Date -Format o)
$lines += '# Source: variables currently defined on this machine'
$lines += '# Transfer automatique recommandé sur le Mac: `vercel login`, `vercel link`, puis `vercel env pull` pour les variables gérées par Vercel.'
$lines += ''

foreach ($key in $keys) {
  $value = Get-EnvValue -Name $key
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    $lines += "$key=$value"
  }
}

Set-Content -Path $OutputPath -Value $lines -Encoding utf8

Write-Host "Sauvegarde écrite dans $OutputPath"
$variableCount = ($lines | Where-Object { $_ -match '^[A-Z0-9_]+=' } | Measure-Object).Count
Write-Host 'Variables trouvées:' $variableCount
