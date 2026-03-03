$ErrorActionPreference = 'Stop'

$envLines = Get-Content .env
$urlLine = $envLines | Where-Object { $_ -like 'VITE_SUPABASE_URL=*' } | Select-Object -First 1
$keyLine = $envLines | Where-Object { $_ -like 'VITE_SUPABASE_ANON_KEY=*' } | Select-Object -First 1

if (-not $urlLine -or -not $keyLine) {
  throw 'Variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes no .env'
}

$url = $urlLine.Substring('VITE_SUPABASE_URL='.Length)
$key = $keyLine.Substring('VITE_SUPABASE_ANON_KEY='.Length)

$headers = @{
  apikey = $key
  Authorization = "Bearer $key"
}

$uri = "$url/rest/v1/users?select=id,name,email,phone,registration_code,is_blocked,created_at,role&role=eq.CLIENT&order=created_at.desc"

$response = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers

Write-Output "TOTAL=$($response.Count)"
$response |
  Select-Object name, email, phone, registration_code, is_blocked, created_at |
  ConvertTo-Json -Depth 4
