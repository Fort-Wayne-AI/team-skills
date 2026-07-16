# Fort Wayne AI Tasks Schema

Source: the **Tasks** data source (`73ab655f-03d8-42e0-a87f-61da3d429c46`) in the canonical project task database. Verified 2026-07-16 through `ntn`.

| Property | Notion type | Allowed values / target | Use when writing |
|---|---|---|---|
| `Task` | `title` | Free text | Required task title. |
| `Status` | `status` | `To Do`, `Blocked`, `In Review`, `In Progress`, `Done` | Primary workflow state. Use exact capitalization. |
| `Done` | `status` | `Not started`, `Done` | Simplified completion state. Keep aligned with `Status` unless the user requests otherwise. |
| `Priority` | `select` | `High`, `Medium`, `Low` | Use only these exact values. |
| `Due Date` | `date` | Notion date or date range | Preserve time/time zone if supplied; do not invent a due date. |
| `Completed On (auto)` | `date` | Notion date | Likely automation-managed. Do not write it unless the owner explicitly directs it or the automation is known absent. |
| `Project` | `relation` | Database `f8cc8a8c-4dce-4bc5-bbf1-31b2d915cbe1` | Requires a target project page ID. Preserve an existing relation unless changing project. |
| `Assignee` | `people` | Notion people objects | Requires the person/user ID; do not infer from a display name. |
| `Reporter` | `people` | Notion people objects | Requires the person/user ID; preserve existing value by default. |

## Property payload shapes

Use this only after fetching the live schema and target page.

```json
{
  "Task": {
    "title": [{ "text": { "content": "Example task" } }]
  },
  "Status": { "status": { "name": "To Do" } },
  "Done": { "status": { "name": "Not started" } },
  "Priority": { "select": { "name": "Medium" } },
  "Due Date": { "date": { "start": "2026-07-20" } },
  "Project": { "relation": [{ "id": "<project-page-id>" }] },
  "Assignee": { "people": [{ "id": "<notion-user-id>" }] },
  "Reporter": { "people": [{ "id": "<notion-user-id>" }] }
}
```

To clear an optional value, use the Notion API's appropriate `null` or empty-array form after confirming the current endpoint documentation. Do not guess a people or project ID.

## Minimal create payload

A minimal task needs a parent data source and a title. Add only user-authorized properties:

```json
{
  "parent": {
    "type": "data_source_id",
    "data_source_id": "73ab655f-03d8-42e0-a87f-61da3d429c46"
  },
  "properties": {
    "Task": {
      "title": [{ "text": { "content": "Example task" } }]
    }
  }
}
```
