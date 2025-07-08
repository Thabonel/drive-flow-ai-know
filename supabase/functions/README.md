# Supabase Functions

## /api/v1/docs

This edge function returns all knowledge documents for a workspace.
Authentication uses a workspace API token stored in the `workspace_api_keys` table.

### Request

`GET /api/v1/docs`

Headers:
- `workspace-api-token: <YOUR_TOKEN>`

Optional query parameters:
- `category` – filter by document category
- `last_updated` – ISO timestamp; returns documents updated after this date
- `title_contains` – returns documents with titles containing this value

### Example

```bash
curl -H "workspace-api-token: YOUR_TOKEN" \
  "https://<project>.supabase.co/functions/v1/api-docs?category=marketing&title_contains=plan"
```

The response will be a JSON array of document records.
