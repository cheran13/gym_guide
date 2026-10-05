# Robust PowerShell HTTP Server for PulseFit AI
$port = 8080
$path = $PSScriptRoot
if (-not $path) { $path = (Get-Location).Path }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  PULSEFIT AI - Adaptive Strength & Nutrition Intelligence" -ForegroundColor Green
    Write-Host "  Running on Localhost: http://localhost:$port/" -ForegroundColor Yellow
    Write-Host "  Opening default browser..." -ForegroundColor Gray
    Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan

    Start-Process "http://localhost:$port/"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $reqUrl = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($reqUrl) -or $reqUrl -eq "/") {
                $reqUrl = "index.html"
            }

            # Normalize path separators
            $reqUrl = $reqUrl -replace '/', '\'
            $filePath = Join-Path $path $reqUrl

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".svg"  { "image/svg+xml" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".ico"  { "image/x-icon" }
                    default { "application/octet-stream" }
                }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $reqUrl")
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            Write-Host "Request error: $_" -ForegroundColor DarkGray
        } finally {
            try { $response.Close() } catch {}
        }
    }
} catch {
    Write-Host "Server error: $_" -ForegroundColor Red
} finally {
    try { $listener.Stop() } catch {}
}
