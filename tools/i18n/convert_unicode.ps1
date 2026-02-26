[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$ReportDir = ".reports/unicode-escapes",
  [switch]$Apply,
  [switch]$IncludeUntracked,
  [switch]$ConvertAll,
  [switch]$FailOnChanges
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$binaryExtensions = New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)
@(
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".tif",
  ".tiff",
  ".psd",
  ".ai",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".wmv",
  ".pdf",
  ".zip",
  ".7z",
  ".rar",
  ".tar",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".jar",
  ".class",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin"
) | ForEach-Object {
  [void]$binaryExtensions.Add($_)
}

function Compare-ByteArrays {
  param(
    [byte[]]$Left,
    [byte[]]$Right
  )

  if ($Left.Length -ne $Right.Length) {
    return $false
  }

  for ($i = 0; $i -lt $Left.Length; $i++) {
    if ($Left[$i] -ne $Right[$i]) {
      return $false
    }
  }

  return $true
}

function Get-BomInfo {
  param([byte[]]$Bytes)

  if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
    return [pscustomobject]@{ HasBom = $true; Encoding = "UTF-8-BOM"; BomLength = 3 }
  }

  if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
    return [pscustomobject]@{ HasBom = $true; Encoding = "UTF-16LE"; BomLength = 2 }
  }

  if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) {
    return [pscustomobject]@{ HasBom = $true; Encoding = "UTF-16BE"; BomLength = 2 }
  }

  return [pscustomobject]@{ HasBom = $false; Encoding = "UTF-8"; BomLength = 0 }
}

function Get-TrackedFiles {
  param(
    [string]$Root,
    [switch]$WithUntracked
  )

  $trackedRaw = (& git -C $Root -c core.quotepath=false ls-files -z) -join ""
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to list tracked files with git ls-files."
  }

  $tracked = $trackedRaw -split "`0" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  $all = @($tracked)

  if ($WithUntracked) {
    $othersRaw = (& git -C $Root -c core.quotepath=false ls-files --others --exclude-standard -z) -join ""
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to list untracked files with git ls-files --others."
    }

    $others = $othersRaw -split "`0" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    $all += @($others)
  }

  return $all | Sort-Object -Unique
}

function Test-IsProbablyBinary {
  param(
    [string]$RelativePath,
    [byte[]]$Bytes,
    [pscustomobject]$BomInfo
  )

  $extension = [System.IO.Path]::GetExtension($RelativePath)
  if ($binaryExtensions.Contains($extension)) {
    return $true
  }

  if ($Bytes.Length -eq 0) {
    return $false
  }

  if ($BomInfo.Encoding -eq "UTF-16LE" -or $BomInfo.Encoding -eq "UTF-16BE") {
    return $false
  }

  $sampleLength = [Math]::Min($Bytes.Length, 4096)
  $controlCount = 0

  for ($i = 0; $i -lt $sampleLength; $i++) {
    $byte = $Bytes[$i]

    if ($byte -eq 0x00) {
      return $true
    }

    $isBadControl = ($byte -ge 0x01 -and $byte -le 0x08) -or ($byte -ge 0x0E -and $byte -le 0x1F)
    if ($isBadControl) {
      $controlCount++
    }
  }

  if (($controlCount / $sampleLength) -gt 0.30) {
    return $true
  }

  return $false
}

function Decode-TextBytes {
  param([byte[]]$Bytes)

  $bomInfo = Get-BomInfo -Bytes $Bytes

  if ($bomInfo.Encoding -eq "UTF-8-BOM") {
    return [pscustomobject]@{
      Success       = $true
      EncodingLabel = "UTF-8-BOM"
      Text          = [System.Text.Encoding]::UTF8.GetString($Bytes, 3, $Bytes.Length - 3)
      BomInfo       = $bomInfo
    }
  }

  if ($bomInfo.Encoding -eq "UTF-16LE") {
    return [pscustomobject]@{
      Success       = $true
      EncodingLabel = "UTF-16LE"
      Text          = [System.Text.Encoding]::Unicode.GetString($Bytes, 2, $Bytes.Length - 2)
      BomInfo       = $bomInfo
    }
  }

  if ($bomInfo.Encoding -eq "UTF-16BE") {
    return [pscustomobject]@{
      Success       = $true
      EncodingLabel = "UTF-16BE"
      Text          = [System.Text.Encoding]::BigEndianUnicode.GetString($Bytes, 2, $Bytes.Length - 2)
      BomInfo       = $bomInfo
    }
  }

  try {
    return [pscustomobject]@{
      Success       = $true
      EncodingLabel = "UTF-8"
      Text          = $utf8Strict.GetString($Bytes)
      BomInfo       = $bomInfo
    }
  }
  catch {
    return [pscustomobject]@{
      Success       = $false
      EncodingLabel = "unknown"
      Text          = $null
      BomInfo       = $bomInfo
    }
  }
}

function Encode-Text {
  param(
    [string]$Text,
    [string]$EncodingLabel
  )

  if ($EncodingLabel -eq "UTF-8") {
    return $utf8NoBom.GetBytes($Text)
  }

  if ($EncodingLabel -eq "UTF-8-BOM") {
    $payload = [System.Text.Encoding]::UTF8.GetBytes($Text)
    return [System.Text.Encoding]::UTF8.GetPreamble() + $payload
  }

  if ($EncodingLabel -eq "UTF-16LE") {
    $payload = [System.Text.Encoding]::Unicode.GetBytes($Text)
    return [System.Text.Encoding]::Unicode.GetPreamble() + $payload
  }

  if ($EncodingLabel -eq "UTF-16BE") {
    $payload = [System.Text.Encoding]::BigEndianUnicode.GetBytes($Text)
    return [System.Text.Encoding]::BigEndianUnicode.GetPreamble() + $payload
  }

  throw "Unsupported encoding label: $EncodingLabel"
}

function Test-IsChineseRelatedCodePoint {
  param([int]$CodePoint)

  if (($CodePoint -ge 0x3400 -and $CodePoint -le 0x4DBF) -or
      ($CodePoint -ge 0x4E00 -and $CodePoint -le 0x9FFF) -or
      ($CodePoint -ge 0xF900 -and $CodePoint -le 0xFAFF) -or
      ($CodePoint -ge 0x20000 -and $CodePoint -le 0x2A6DF) -or
      ($CodePoint -ge 0x2A700 -and $CodePoint -le 0x2B73F) -or
      ($CodePoint -ge 0x2B740 -and $CodePoint -le 0x2B81F) -or
      ($CodePoint -ge 0x2B820 -and $CodePoint -le 0x2CEAF) -or
      ($CodePoint -ge 0x2CEB0 -and $CodePoint -le 0x2EBEF) -or
      ($CodePoint -ge 0x2E80 -and $CodePoint -le 0x2FDF) -or
      ($CodePoint -ge 0x3000 -and $CodePoint -le 0x303F) -or
      ($CodePoint -ge 0x31C0 -and $CodePoint -le 0x31EF) -or
      ($CodePoint -ge 0xFF00 -and $CodePoint -le 0xFFEF)) {
    return $true
  }

  return $false
}

function Test-ContainsChineseRelated {
  param([string]$Text)

  for ($i = 0; $i -lt $Text.Length; ) {
    $codePoint = [int][char]$Text[$i]
    if ([char]::IsHighSurrogate($Text[$i]) -and ($i + 1) -lt $Text.Length -and [char]::IsLowSurrogate($Text[$i + 1])) {
      $codePoint = [char]::ConvertToUtf32($Text[$i], $Text[$i + 1])
      $i += 2
    }
    else {
      $i += 1
    }

    if (Test-IsChineseRelatedCodePoint -CodePoint $codePoint) {
      return $true
    }
  }

  return $false
}

function Test-IsSafeReplacementText {
  param([string]$Text)

  foreach ($char in $Text.ToCharArray()) {
    $code = [int][char]$char
    if ($code -lt 0x20 -or $code -eq 0x7F -or $code -eq 0x2028 -or $code -eq 0x2029) {
      return $false
    }

    if ($char -eq "\" -or $char -eq "'" -or $char -eq '"') {
      return $false
    }
  }

  return $true
}

function Decode-UnicodeBlock {
  param([string]$RawBlock)

  $matches = [System.Text.RegularExpressions.Regex]::Matches($RawBlock, "\\u([0-9a-fA-F]{4})")
  $builder = New-Object System.Text.StringBuilder

  foreach ($match in $matches) {
    $codeUnit = [Convert]::ToInt32($match.Groups[1].Value, 16)
    [void]$builder.Append([char]$codeUnit)
  }

  return $builder.ToString()
}

function Convert-UnicodeEscapesInText {
  param(
    [string]$Text,
    [switch]$ReplaceAll
  )

  $pattern = "(?<!\\)(?:\\u[0-9a-fA-F]{4})+"
  $replacementCounter = [ref]0
  $samples = New-Object System.Collections.Generic.List[object]

  $newText = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{
      param([System.Text.RegularExpressions.Match]$match)

      $raw = $match.Value
      $decoded = Decode-UnicodeBlock -RawBlock $raw

      if (-not (Test-IsSafeReplacementText -Text $decoded)) {
        return $raw
      }

      if (-not $ReplaceAll -and -not (Test-ContainsChineseRelated -Text $decoded)) {
        return $raw
      }

      $replacementCounter.Value++
      if ($samples.Count -lt 5) {
        $samples.Add([pscustomobject]@{
            from = $raw
            to   = $decoded
          }) | Out-Null
      }

      return $decoded
    }
  )

  return [pscustomobject]@{
    Text           = $newText
    ReplacedCount  = $replacementCounter.Value
    SampleReplaced = @($samples.ToArray())
  }
}

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$resolvedReportDir = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
  $ReportDir
}
else {
  Join-Path $resolvedRepoRoot $ReportDir
}

New-Item -ItemType Directory -Path $resolvedReportDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportBaseName = "unicode-escape-report-$timestamp"
$jsonReportPath = Join-Path $resolvedReportDir "$reportBaseName.json"
$tsvReportPath = Join-Path $resolvedReportDir "$reportBaseName.tsv"
$backupRoot = Join-Path $resolvedReportDir "backups/$timestamp"

$files = Get-TrackedFiles -Root $resolvedRepoRoot -WithUntracked:$IncludeUntracked

$summary = [ordered]@{
  scannedFiles              = 0
  scannedTextFiles          = 0
  skippedBinaryFiles        = 0
  skippedUnsupportedText    = 0
  filesWithUnicodeEscapes   = 0
  replacedUnicodeSegments   = 0
  convertedFiles            = 0
}

$issues = New-Object System.Collections.Generic.List[object]
$errors = New-Object System.Collections.Generic.List[object]

foreach ($relativePath in $files) {
  $summary.scannedFiles++
  $fullPath = Join-Path $resolvedRepoRoot $relativePath

  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    continue
  }

  try {
    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $decoded = Decode-TextBytes -Bytes $bytes
    $bomInfo = $decoded.BomInfo

    if (Test-IsProbablyBinary -RelativePath $relativePath -Bytes $bytes -BomInfo $bomInfo) {
      $summary.skippedBinaryFiles++
      continue
    }

    $summary.scannedTextFiles++

    if (-not $decoded.Success) {
      $summary.skippedUnsupportedText++
      continue
    }

    $result = Convert-UnicodeEscapesInText -Text $decoded.Text -ReplaceAll:$ConvertAll

    if ($result.ReplacedCount -le 0) {
      continue
    }

    $summary.filesWithUnicodeEscapes++
    $summary.replacedUnicodeSegments += $result.ReplacedCount

    $action = "would_convert"
    if ($Apply) {
      $newBytes = Encode-Text -Text $result.Text -EncodingLabel $decoded.EncodingLabel
      if (-not (Compare-ByteArrays -Left $bytes -Right $newBytes)) {
        $backupPath = Join-Path $backupRoot $relativePath
        $backupFolder = Split-Path $backupPath -Parent
        New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
        [System.IO.File]::WriteAllBytes($backupPath, $bytes)

        [System.IO.File]::WriteAllBytes($fullPath, $newBytes)
        $summary.convertedFiles++
      }
      $action = "converted"
    }

    $issues.Add([pscustomobject]@{
        path             = $relativePath
        encoding         = $decoded.EncodingLabel
        replacedSegments = $result.ReplacedCount
        action           = $action
        samples          = $result.SampleReplaced
      }) | Out-Null
  }
  catch {
    $errors.Add([pscustomobject]@{
        path    = $relativePath
        message = $_.Exception.Message
      }) | Out-Null
  }
}

$reportObject = [pscustomobject]@{
  generatedAt      = (Get-Date).ToString("o")
  repoRoot         = $resolvedRepoRoot
  apply            = $Apply.IsPresent
  includeUntracked = $IncludeUntracked.IsPresent
  convertAll       = $ConvertAll.IsPresent
  summary          = [pscustomobject]$summary
  issues           = @($issues.ToArray())
  errors           = @($errors.ToArray())
}

$json = $reportObject | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($jsonReportPath, $json, $utf8NoBom)

$tsvLines = New-Object System.Collections.Generic.List[string]
$tsvLines.Add("segments`taction`tpath") | Out-Null
foreach ($issue in $issues) {
  $tsvLines.Add(("{0}`t{1}`t{2}" -f $issue.replacedSegments, $issue.action, $issue.path)) | Out-Null
}
[System.IO.File]::WriteAllLines($tsvReportPath, $tsvLines, $utf8NoBom)

Write-Host ("[unicode] repo={0}" -f $resolvedRepoRoot)
Write-Host ("[unicode] mode={0}" -f ($(if ($Apply) { "convert" } else { "scan" })))
Write-Host ("[unicode] filter={0}" -f ($(if ($ConvertAll) { "all_unicode_escapes" } else { "chinese_related_only" })))
Write-Host ("[unicode] scanned={0} text={1} binary_skipped={2} unsupported_text={3}" -f $summary.scannedFiles, $summary.scannedTextFiles, $summary.skippedBinaryFiles, $summary.skippedUnsupportedText)
Write-Host ("[unicode] files_with_matches={0} replaced_segments={1} converted_files={2}" -f $summary.filesWithUnicodeEscapes, $summary.replacedUnicodeSegments, $summary.convertedFiles)
Write-Host ("[unicode] report_json={0}" -f $jsonReportPath)
Write-Host ("[unicode] report_tsv={0}" -f $tsvReportPath)
if ($Apply -and $summary.convertedFiles -gt 0) {
  Write-Host ("[unicode] backups={0}" -f $backupRoot)
}

if ($FailOnChanges -and $issues.Count -gt 0) {
  exit 1
}

exit 0
