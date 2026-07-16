# Notion CLI Operations

## Dependency and authentication

`@fort-wayne-ai/team-skills` declares `ntn@0.19.0` as an npm dependency. After installing the package, invoke it through the package-local binary:

```bash
npx ntn --version
export NOTION_API_TOKEN="$(secret-command)" # retrieve privately; never paste a token into history
ntn whoami
```

`ntn` reads the public-API credential from **`NOTION_API_TOKEN`**. A project may use a different internal variable name (for example `NOTION_TOKEN`); map it into `NOTION_API_TOKEN` in its private environment before calling `ntn`.

## Database and data-source discovery

A Notion database can contain one or more data sources. Never send a database ID to `ntn datasources query`.

```bash
ntn datasources resolve <database-id> --json
ntn api /v1/data_sources/<data-source-id> --notion-version 2025-09-03
ntn datasources query <data-source-id> --limit 50 --json
```

Use the schema response to learn property names, types, select values, and relation targets before a write.

## Query filters

Pass Notion's filter object as JSON. Example: an approved-checkbox filter.

```bash
ntn datasources query <data-source-id> \
  --filter '{"property":"To Share","checkbox":{"equals":true}}' \
  --limit 50 --json
```

Paginate when `has_more` is `true`; pass the returned cursor with `--start-cursor`.

## Create a page in a data source

Use the current endpoint documentation first:

```bash
ntn api /v1/pages --docs
```

Create only after explicit authorization and schema inspection. Store payloads in a temporary private JSON file rather than constructing complex JSON in a shell command:

```bash
cat > /tmp/notion-create.json <<'JSON'
{
  "parent": { "type": "data_source_id", "data_source_id": "<data-source-id>" },
  "properties": {
    "<title-property>": { "title": [{ "text": { "content": "<title>" } }] }
  }
}
JSON
ntn api /v1/pages -X POST --data @/tmp/notion-create.json
rm -f /tmp/notion-create.json
```

The token, property names, and values must not be placed in committed files.

## Update a page

Retrieve the page and schema, prepare the smallest applicable properties patch, then issue `PATCH`:

```bash
ntn api /v1/pages/<page-id> -X GET
ntn api /v1/pages/<page-id> -X PATCH --data @/tmp/notion-update.json
```

Retrieve the page again after a successful write. Notion-generated fields such as `created_time` and `last_edited_time` cannot be written.

## Failure handling

- `401 unauthorized`: token is missing, invalid, expired, or revoked. Stop; replace it through the approved secret manager.
- `403`: the integration lacks access or the required Insert/Update Content capability. Ask the workspace owner to connect/configure it.
- `404`: confirm the workspace connection and ID; resolve database IDs again.
- `400 validation_error`: re-fetch the schema and correct the exact property shape or select/status value.
