# Runs reviewed Drizzle migrations against an explicitly confirmed Supabase target.
# Use an interactive shell, not CI. Never paste credentials into chat or command history.
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '../..')
$previousLocation = Get-Location
$oldDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
$pointer = [IntPtr]::Zero
$exitCode = 1
try {
    Write-Host 'Back up the database and review pending migrations and migration history first.'
    Write-Host 'Use the Supabase SESSION pooler URI, with TLS and a URL-encoded password.'
    $secure = Read-Host 'Paste the session pooler URI (input is hidden)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $databaseUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $uri = $null
    if (-not [Uri]::TryCreate($databaseUrl, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -notin @('postgres', 'postgresql') -or
        $uri.Host -notmatch '\.pooler\.supabase\.com$' -or $uri.Port -ne 5432 -or
        $uri.UserInfo -notmatch '^postgres\.[^:]+:.+' -or
        $uri.Query -notmatch '(?:\?|&)sslmode=(?:require|verify-ca|verify-full)(?:&|$)') {
        throw 'Expected a Supabase session pooler URI on port 5432 with credentials and sslmode=require (or verify-ca/verify-full). No migration was run.'
    }
    Write-Host ("Target host: {0}; port: {1}; database: {2}" -f $uri.Host, $uri.Port, $uri.AbsolutePath.TrimStart('/'))
    Write-Host 'Compare the target with your intended production project in Supabase Connect.'
    $confirmation = Read-Host 'Type MIGRATE PRODUCTION to continue'
    if ($confirmation -cne 'MIGRATE PRODUCTION') { throw 'Confirmation did not match. No migration was run.' }
    Set-Location $repo
    $env:DATABASE_URL = $databaseUrl
    & npm run db:mig
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { Write-Error 'Migration failed. Stop and inspect the redacted error and migration history before retrying.' -ErrorAction Continue }
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($null -eq $oldDatabaseUrl) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
    else { [Environment]::SetEnvironmentVariable('DATABASE_URL', $oldDatabaseUrl, 'Process') }
    Remove-Variable secure, databaseUrl, uri, oldDatabaseUrl -ErrorAction SilentlyContinue
    Set-Location $previousLocation
}
exit $exitCode
