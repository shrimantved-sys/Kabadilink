#!/usr/bin/env bash
# KabadiLink API Smoke Test Script
# Usage: ./scripts/smoke.sh <API_URL>

set -e

API_URL="${1:-http://localhost:3000}"
# Remove trailing slash
API_URL="${API_URL%/}"

echo "============================================="
echo " KabadiLink Smoke Test — Live API Gateway"
echo " Target: ${API_URL}"
echo "============================================="

echo -e "\n1. Testing Seed Demo Data (POST /demo/seed)..."
SEED_RES=$(curl -s -X POST "${API_URL}/demo/seed" -H "Content-Type: application/json")
echo "Response: ${SEED_RES}"

echo -e "\n2. Testing Get Recyclers (GET /recyclers)..."
RECYCLERS_RES=$(curl -s "${API_URL}/recyclers")
echo "Response: ${RECYCLERS_RES}"

echo -e "\n3. Testing Get Open Collector Requests (GET /collector/requests)..."
COLLECTOR_RES=$(curl -s "${API_URL}/collector/requests")
echo "Response: ${COLLECTOR_RES}"

echo -e "\n4. Creating New Household Request (POST /requests)..."
CREATE_PAYLOAD='{
  "householdName": "Smoke Test User",
  "phone": "9876543210",
  "locality": "Indiranagar",
  "landmark": "Near 100 Feet Road",
  "pickupDate": "2026-10-15",
  "window": "morning",
  "items": [
    { "category": "laptop", "quantity": 1, "hasBattery": true },
    { "category": "cables_chargers", "quantity": 2, "hasBattery": false }
  ],
  "dataWipedConfirmed": true
}'
CREATE_RES=$(curl -s -X POST "${API_URL}/requests" \
  -H "Content-Type: application/json" \
  -d "${CREATE_PAYLOAD}")
echo "Response: ${CREATE_RES}"

REQ_ID=$(echo "${CREATE_RES}" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
REQ_CODE=$(echo "${CREATE_RES}" | grep -o '"code":"[^"]*' | cut -d'"' -f4 || echo "")
REQ_OTP=$(echo "${CREATE_RES}" | grep -o '"pickupOtp":"[^"]*' | cut -d'"' -f4 || echo "")

echo "Created Request ID: ${REQ_ID}, Code: ${REQ_CODE}, OTP: ${REQ_OTP}"

if [ -n "${REQ_ID}" ]; then
  echo -e "\n5. Fetching Request Status (GET /requests/${REQ_ID})..."
  GET_RES=$(curl -s "${API_URL}/requests/${REQ_ID}")
  echo "Response: ${GET_RES}"

  echo -e "\n6. Collector Accepting Trip (POST /collector/accept)..."
  ACCEPT_PAYLOAD="{\"collectorId\":\"COL-01\",\"requestIds\":[\"${REQ_ID}\"]}"
  ACCEPT_RES=$(curl -s -X POST "${API_URL}/collector/accept" \
    -H "Content-Type: application/json" \
    -d "${ACCEPT_PAYLOAD}")
  echo "Response: ${ACCEPT_RES}"

  echo -e "\n7. Confirming Doorstep Pickup (POST /collector/requests/${REQ_ID}/pickup)..."
  PICKUP_PAYLOAD="{\"collectorId\":\"COL-01\",\"otp\":\"${REQ_OTP}\",\"actualWeightKg\":3.4}"
  PICKUP_RES=$(curl -s -X POST "${API_URL}/collector/requests/${REQ_ID}/pickup" \
    -H "Content-Type: application/json" \
    -d "${PICKUP_PAYLOAD}")
  echo "Response: ${PICKUP_RES}"

  echo -e "\n8. Handing over to Authorised Recycler (POST /collector/requests/${REQ_ID}/handover)..."
  HANDOVER_PAYLOAD="{\"collectorId\":\"COL-01\",\"recyclerId\":\"REC-01\"}"
  HANDOVER_RES=$(curl -s -X POST "${API_URL}/collector/requests/${REQ_ID}/handover" \
    -H "Content-Type: application/json" \
    -d "${HANDOVER_PAYLOAD}")
  echo "Response: ${HANDOVER_RES}"

  RECEIPT_ID=$(echo "${HANDOVER_RES}" | grep -o '"receiptId":"[^"]*' | cut -d'"' -f4 || echo "")

  if [ -n "${RECEIPT_ID}" ]; then
    echo -e "\n9. Fetching Cryptographic Receipt (GET /receipts/${RECEIPT_ID})..."
    RECEIPT_RES=$(curl -s "${API_URL}/receipts/${RECEIPT_ID}")
    echo "Response: ${RECEIPT_RES}"

    echo -e "\n10. Verifying Public SHA-256 Tamper Proof (GET /verify/${RECEIPT_ID})..."
    VERIFY_RES=$(curl -s "${API_URL}/verify/${RECEIPT_ID}")
    echo "Response: ${VERIFY_RES}"
  fi
fi

echo -e "\n============================================="
echo " ✅ Smoke Test Completed Successfully!"
echo "============================================="
