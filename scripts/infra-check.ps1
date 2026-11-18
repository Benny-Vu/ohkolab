# Read-only check of OHKOLab's live infrastructure. Changes nothing.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\infra-check.ps1
#
# GitHub checks use the gh CLI (already signed in). The Supabase checks (auth URLs,
# RLS) use the Supabase Management API and need a personal access token in the
# environment variable SUPABASE_ACCESS_TOKEN. Without it they are reported as SKIP.
# Exit code 1 if any check fails.

$ErrorActionPreference = "Stop"
$repo = "vu-forge/ohkolab"
$projectRef = "jzpyoyjnhuokprsdoiqf"
$expectedSiteUrl = "https://ohkolab.com"
$expectedRedirects = @("https://ohkolab.com/**", "http://localhost:5173/**")
$requiredSecrets = @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_SENTRY_DSN", "VITE_POSTHOG_KEY", "SENTRY_AUTH_TOKEN")
$requiredVariables = @("SENTRY_ORG", "SENTRY_PROJECT", "VITE_POSTHOG_HOST")

$gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
if (-not $gh) { $gh = "C:\Program Files\GitHub CLI\gh.exe" }

$results = New-Object System.Collections.Generic.List[object]
function Add-Result($name, $status, $detail) {
  $results.Add([pscustomobject]@{ Check = $name; Status = $status; Detail = $detail })
}

# --- GitHub: secrets and variables (names only; values are never readable) ---
try {
  $secrets = (& $gh secret list -R $repo --json name | ConvertFrom-Json).name
  $missing = $requiredSecrets | Where-Object { $secrets -notcontains $_ }
  if ($missing) { Add-Result "GitHub secrets" "FAIL" ("missing: " + ($missing -join ", ")) }
  else { Add-Result "GitHub secrets" "OK" ("all $($requiredSecrets.Count) present") }
} catch { Add-Result "GitHub secrets" "FAIL" $_.Exception.Message }

try {
  $vars = (& $gh variable list -R $repo --json name | ConvertFrom-Json).name
  $missing = $requiredVariables | Where-Object { $vars -notcontains $_ }
  if ($missing) { Add-Result "GitHub variables" "FAIL" ("missing: " + ($missing -join ", ")) }
  else { Add-Result "GitHub variables" "OK" ("all $($requiredVariables.Count) present") }
} catch { Add-Result "GitHub variables" "FAIL" $_.Exception.Message }

# --- GitHub Pages: custom domain, HTTPS, workflow deploys ---
try {
  $pages = & $gh api "repos/$repo/pages" | ConvertFrom-Json
  $ok = ($pages.cname -eq "ohkolab.com") -and $pages.https_enforced -and ($pages.build_type -eq "workflow")
  Add-Result "Pages (domain, HTTPS)" ($(if ($ok) { "OK" } else { "FAIL" })) "cname=$($pages.cname) https_enforced=$($pages.https_enforced) build=$($pages.build_type)"
} catch { Add-Result "Pages (domain, HTTPS)" "FAIL" $_.Exception.Message }

# --- The site answers over HTTPS, and a fixed route returns 200 ---
foreach ($url in @("https://ohkolab.com/", "https://ohkolab.com/terms")) {
  try {
    $code = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20).StatusCode
    Add-Result "Site $url" ($(if ($code -eq 200) { "OK" } else { "FAIL" })) "HTTP $code"
  } catch { Add-Result "Site $url" "FAIL" $_.Exception.Message }
}

# --- Supabase (needs SUPABASE_ACCESS_TOKEN) ---
$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) { $token = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "User") }
if (-not $token) {
  Add-Result "Supabase auth URLs" "SKIP" "set SUPABASE_ACCESS_TOKEN to check"
  Add-Result "Supabase RLS on every table" "SKIP" "set SUPABASE_ACCESS_TOKEN to check"
} else {
  $headers = @{ Authorization = "Bearer $token" }
  try {
    $auth = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/config/auth" -Headers $headers -TimeoutSec 30
    $allow = @($auth.uri_allow_list -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $missing = $expectedRedirects | Where-Object { $allow -notcontains $_ }
    $ok = ($auth.site_url -eq $expectedSiteUrl) -and -not $missing
    $detail = "site_url=$($auth.site_url); redirects=" + ($allow -join ", ")
    if ($missing) { $detail += "; missing: " + ($missing -join ", ") }
    Add-Result "Supabase auth URLs" ($(if ($ok) { "OK" } else { "FAIL" })) $detail
  } catch { Add-Result "Supabase auth URLs" "FAIL" $_.Exception.Message }

  try {
    $sql = "select coalesce(string_agg(c.relname, ', ' order by c.relname), '') as missing, count(*) filter (where true) as total from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity"
    $body = @{ query = $sql; read_only = $true } | ConvertTo-Json
    $rows = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 30
    $missingRls = @($rows)[0].missing
    if ($missingRls) { Add-Result "Supabase RLS on every table" "FAIL" "without RLS: $missingRls" }
    else { Add-Result "Supabase RLS on every table" "OK" "every public table has RLS" }
  } catch { Add-Result "Supabase RLS on every table" "FAIL" $_.Exception.Message }
}

$results | Format-Table -AutoSize -Wrap
if ($results.Status -contains "FAIL") { exit 1 }
