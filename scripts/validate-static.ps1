$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$htmlFiles = @(
  Join-Path $repoRoot 'index.html'
) + (Get-ChildItem (Join-Path $repoRoot 'views') -Filter *.html -File | Select-Object -ExpandProperty FullName)

$problems = New-Object System.Collections.Generic.List[string]

function Add-Problem {
  param([string]$Message)
  $problems.Add($Message)
}

function Get-CanonicalHrefs {
  param([string]$Content)
  $matches = [regex]::Matches($Content, '<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>', 'IgnoreCase')
  foreach ($match in $matches) {
    $match.Groups[1].Value
  }
}

function Get-LocalRefs {
  param([string]$Content)
  $matches = [regex]::Matches($Content, '(?:src|href)="([^"]+)"', 'IgnoreCase')
  foreach ($match in $matches) {
    $match.Groups[1].Value
  }
}

foreach ($file in $htmlFiles) {
  $content = Get-Content $file -Raw
  $relativeFile = Resolve-Path -Relative $file

  $canonicals = @(Get-CanonicalHrefs $content)
  if ($canonicals.Count -eq 0) {
    Add-Problem "$relativeFile : missing canonical tag"
  } elseif ($canonicals.Count -gt 1) {
    Add-Problem "$relativeFile : multiple canonical tags found"
  }

  foreach ($canonical in $canonicals) {
    if ($canonical -match 'yourdomain\.com') {
      Add-Problem "$relativeFile : placeholder canonical domain still present ($canonical)"
    }
  }

  foreach ($ref in (Get-LocalRefs $content)) {
    if ($ref -match '^(https?:|mailto:|tel:|sms:|#)') {
      continue
    }

    $cleanRef = ($ref -split '[?#]')[0]
    if ([string]::IsNullOrWhiteSpace($cleanRef)) {
      continue
    }

    $candidate = $null
    if ($cleanRef.StartsWith('/')) {
      $candidate = Join-Path $repoRoot $cleanRef.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
    } else {
      $candidate = Join-Path (Split-Path -Parent $file) $cleanRef.Replace('/', [IO.Path]::DirectorySeparatorChar)
    }

    if (-not (Test-Path $candidate)) {
      Add-Problem "$relativeFile : missing local reference '$ref'"
    }
  }
}

if ($problems.Count -gt 0) {
  Write-Host 'Static validation failed:' -ForegroundColor Red
  foreach ($problem in $problems) {
    Write-Host " - $problem"
  }
  exit 1
}

Write-Host 'Static validation passed.' -ForegroundColor Green
