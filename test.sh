#!/bin/bash
# Test script for Event Ticketing Platform

BASE_URL="http://localhost:3000"
COMPOSE="docker compose -f infrastructure/docker-compose.yml --env-file .env"

echo "=== 0. Waiting for services to be ready ==="
for i in {1..30}; do
  if curl -s "$BASE_URL/events" > /dev/null 2>&1; then
    echo "Services are ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 1
done

echo "=== 1. Register a customer ==="
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password123"}'

echo -e "\n\n=== 2. Login as customer ==="
CUSTOMER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password123"}' | jq -r '.accessToken')
echo "Token: $CUSTOMER_TOKEN"

echo -e "\n\n=== 3. Register an organizer ==="
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@example.com","password":"password123"}'

echo -e "\n\n=== 4. Update organizer role in DB ==="
$COMPOSE exec postgres psql -U postgres -d auth_db \
  -c "UPDATE users SET role = 'ORGANIZER' WHERE email = 'organizer@example.com';"

echo -e "\n\n=== 5. Login as organizer ==="
ORGANIZER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@example.com","password":"password123"}' | jq -r '.accessToken')
echo "Token: $ORGANIZER_TOKEN"

echo -e "\n\n=== 6. Create an event ==="
EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Concert","location":"NYC","startsAt":"2026-12-01T00:00:00Z","capacity":100}')
echo "$EVENT_RESPONSE"
EVENT_ID=$(echo "$EVENT_RESPONSE" | jq -r '.id')
echo "Event ID: $EVENT_ID"

echo -e "\n\n=== 6.5. Wait for Kafka event synchronization ==="
sleep 5

echo -e "\n\n=== 7. List all events ==="
curl -s "$BASE_URL/events" | jq .

echo -e "\n\n=== 8. Purchase tickets ==="
curl -X POST "$BASE_URL/tickets/purchase" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Idempotency-Key: test-key-001" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"quantity\":2}" | jq .

echo -e "\n\n=== 9. View my tickets ==="
curl -s "$BASE_URL/tickets" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | jq .

echo -e "\n\n=== 10. Update event capacity ==="
curl -X PATCH "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capacity":150}' | jq .

echo -e "\n\n=== 11. Delete event ==="
curl -X DELETE "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" | jq .

echo -e "\n\n=== 12. Verify event is deleted ==="
curl -s "$BASE_URL/events" | jq .

echo -e "\n\n=== All tests completed ==="
