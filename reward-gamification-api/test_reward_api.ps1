Invoke-RestMethod http://127.0.0.1:8002/health

$body = @{
  event = "conversation_completed"
  current_xp = 0
  moderation_label = "NON_TOXIC"
  request_id = "manual-nontoxic-001"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8002/reward/evaluate -Method POST -ContentType "application/json" -Body $body

$body = @{
  event = "conversation_completed"
  current_xp = 0
  moderation_label = "TOXIC"
  request_id = "manual-toxic-001"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8002/reward/evaluate -Method POST -ContentType "application/json" -Body $body
