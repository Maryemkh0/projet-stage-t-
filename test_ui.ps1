# Test script for CI/CD AI App API
# Ensure the Spring Boot server is running at http://localhost:8080

# Get current status
Write-Host "Fetching pipeline status..."
$res = Invoke-WebRequest -Uri 'http://localhost:8080/api/pipeline/status' -UseBasicParsing
Write-Host "Status response:" $res.Content

# Trigger a pipeline run
Write-Host "Starting pipeline..."
$resRun = Invoke-WebRequest -Uri 'http://localhost:8080/api/pipeline/run' -Method POST -UseBasicParsing
Write-Host "Run response:" $resRun.Content

# Wait a few seconds and poll status
Start-Sleep -Seconds 5
$resPoll = Invoke-WebRequest -Uri 'http://localhost:8080/api/pipeline/status' -UseBasicParsing
Write-Host "Polled status after 5s:" $resPoll.Content

# Reset pipeline
Write-Host "Resetting pipeline..."
$resReset = Invoke-WebRequest -Uri 'http://localhost:8080/api/pipeline/reset' -Method POST -UseBasicParsing
Write-Host "Reset response:" $resReset.Content
