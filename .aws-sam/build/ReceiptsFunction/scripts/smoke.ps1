# KabadiLink API Smoke Test Script (PowerShell)
# Usage: .\scripts\smoke.ps1 -ApiUrl "https://xxxx.execute-api.ap-south-1.amazonaws.com"

param (
    [string]$ApiUrl = "http://localhost:3000"
)

$ApiUrl = $ApiUrl.TrimEnd("/")
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " KabadiLink Smoke Test — Live API Gateway" -ForegroundColor Cyan
Write-Host " Target: $ApiUrl" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

try {
    Write-Host "`n1. Testing Seed Demo Data (POST /demo/seed)..." -ForegroundColor Yellow
    $seedRes = Invoke-RestMethod -Uri "$ApiUrl/demo/seed" -Method Post -ContentType "application/json"
    $seedRes | ConvertTo-Json -Depth 3 | Write-Host

    Write-Host "`n2. Testing Get Recyclers (GET /recyclers)..." -ForegroundColor Yellow
    $recyclersRes = Invoke-RestMethod -Uri "$ApiUrl/recyclers" -Method Get
    Write-Host "Recyclers found: $($recyclersRes.recyclers.Count)"

    Write-Host "`n3. Testing Get Open Collector Requests (GET /collector/requests)..." -ForegroundColor Yellow
    $collectorRes = Invoke-RestMethod -Uri "$ApiUrl/collector/requests" -Method Get
    Write-Host "Locality Groups found: $($collectorRes.localityGroups.Count)"

    Write-Host "`n4. Creating New Household Request (POST /requests)..." -ForegroundColor Yellow
    $createBody = @{
        householdName = "Smoke Test User"
        phone = "9876543210"
        locality = "Indiranagar"
        landmark = "Near 100 Feet Road"
        pickupDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        window = "morning"
        items = @(
            @{ category = "laptop"; quantity = 1; hasBattery = $true }
            @{ category = "cables_chargers"; quantity = 2; hasBattery = $false }
        )
        dataWipedConfirmed = $true
    } | ConvertTo-Json -Depth 4

    $createRes = Invoke-RestMethod -Uri "$ApiUrl/requests" -Method Post -Body $createBody -ContentType "application/json"
    $reqId = $createRes.request.id
    $reqCode = $createRes.request.code
    $otp = $createRes.pickupOtp
    Write-Host "Created Request ID: $reqId, Code: $reqCode, OTP: $otp" -ForegroundColor Green

    Write-Host "`n5. Fetching Request Status (GET /requests/$reqId)..." -ForegroundColor Yellow
    $getRes = Invoke-RestMethod -Uri "$ApiUrl/requests/$reqId" -Method Get
    Write-Host "Status: $($getRes.request.status), Events: $($getRes.events.Count)"

    Write-Host "`n6. Collector Accepting Trip (POST /collector/accept)..." -ForegroundColor Yellow
    $acceptBody = @{
        collectorId = "COL-01"
        requestIds = @($reqId)
    } | ConvertTo-Json
    $acceptRes = Invoke-RestMethod -Uri "$ApiUrl/collector/accept" -Method Post -Body $acceptBody -ContentType "application/json"
    Write-Host "Accepted count: $($acceptRes.acceptedIds.Count)"

    Write-Host "`n7. Confirming Doorstep Pickup (POST /collector/requests/$reqId/pickup)..." -ForegroundColor Yellow
    $pickupBody = @{
        collectorId = "COL-01"
        otp = $otp
        actualWeightKg = 3.5
    } | ConvertTo-Json
    $pickupRes = Invoke-RestMethod -Uri "$ApiUrl/collector/requests/$reqId/pickup" -Method Post -Body $pickupBody -ContentType "application/json"
    Write-Host "Confirmed pickup weight: $($pickupRes.request.actualWeightKg) kg, status: $($pickupRes.request.status)"

    Write-Host "`n8. Handing over to Authorised Recycler (POST /collector/requests/$reqId/handover)..." -ForegroundColor Yellow
    $handoverBody = @{
        collectorId = "COL-01"
        recyclerId = "REC-01"
    } | ConvertTo-Json
    $handoverRes = Invoke-RestMethod -Uri "$ApiUrl/collector/requests/$reqId/handover" -Method Post -Body $handoverBody -ContentType "application/json"
    $receiptId = $handoverRes.receipt.receiptId
    Write-Host "Issued Receipt ID: $receiptId, Fingerprint: $($handoverRes.receipt.shortCode)" -ForegroundColor Green

    Write-Host "`n9. Fetching Cryptographic Receipt (GET /receipts/$receiptId)..." -ForegroundColor Yellow
    $receiptRes = Invoke-RestMethod -Uri "$ApiUrl/receipts/$receiptId" -Method Get
    Write-Host "Receipt loaded: $($receiptRes.receipt.receiptId), Items: $($receiptRes.receipt.items.Count)"

    Write-Host "`n10. Verifying Public SHA-256 Tamper Proof (GET /verify/$receiptId)..." -ForegroundColor Yellow
    $verifyRes = Invoke-RestMethod -Uri "$ApiUrl/verify/$receiptId" -Method Get
    Write-Host "Verification result: isValid = $($verifyRes.isValid), shortCode = $($verifyRes.shortCode)" -ForegroundColor Green

    Write-Host "`n=============================================" -ForegroundColor Cyan
    Write-Host " ✅ All Smoke Test Steps Passed Successfully!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Smoke Test Failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Server response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
