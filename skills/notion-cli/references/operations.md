# Notion CLI Operations

## Dependency and authentication

`@fort-wayne-ai/team-skills` declares `ntn@0.19.0` as an npm dependency. After installing the package, always invoke its local binary through `npx --no-install`:

```bash
npx --no-install ntn --version
# Retrieve the token privately; never paste it into shell history or a committed file.
export NOTION_API_TOKEN="$(secret-command)"
npx --no-install ntn whoami
```

`ntn` reads the public-API credential from **`NOTION_API_TOKEN`**. A project may use a different internal variable name (for example `NOTION_TOKEN`); map it into `NOTION_API_TOKEN` in its private environment before calling `ntn`.

The bundled native CLI supports macOS, Linux, and Windows on `x64` and `arm64`. Other platforms need a separately supported installation; use its absolute path rather than relying on `npx --no-install`.

## Database and data-source discovery

A Notion database can contain one or more data sources. Never send a database ID to a data-source query.

```bash
npx --no-install ntn datasources resolve <database-id> --json
npx --no-install ntn api /v1/data_sources/<data-source-id> --notion-version 2025-09-03
npx --no-install ntn datasources query <data-source-id> --limit 50 --json
```

Use the schema response to learn property names, types, select values, and relation targets before a write.

## Query filters

Pass Notion's filter object as JSON. Example: an approved-checkbox filter.

```bash
npx --no-install ntn datasources query <data-source-id> \
  --filter '{"property":"To Share","checkbox":{"equals":true}}' \
  --limit 50 --json
```

Paginate when `has_more` is `true`; pass the returned cursor with `--start-cursor`.

## Create a page in a data source

Use the current endpoint documentation first:

```bash
npx --no-install ntn api /v1/pages --docs
```

Create only after explicit authorization and schema inspection. Never use predictable files in `/tmp` for shared payload data. Create a unique owner-only file and arrange cleanup before writing the payload:

```bash
umask 077
payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT HUP INT TERM
cat > "$payload" <<'JSON'
{
  "parent": { "type": "data_source_id", "data_source_id": "<data-source-id>" },
  "properties": {
    "<title-property>": { "title": [{ "text": { "content": "<title>" } }] }
  }
}
JSON
npx --no-install ntn api /v1/pages -X POST --data "@$payload"
```

The token, property names, and values must not be placed in committed files. The shell removes the private payload when it exits.

## Update a page

Retrieve the page and schema, prepare the smallest applicable properties patch in a unique private payload file as above, then issue `PATCH`:

```bash
npx --no-install ntn api /v1/pages/<page-id> -X GET
npx --no-install ntn api /v1/pages/<page-id> -X PATCH --data "@$payload"
```

Retrieve the page again after a successful write. Notion-generated fields such as `created_time` and `last_edited_time` cannot be written.

## Failure handling

- `401 unauthorized`: token is missing, invalid, expired, or revoked. Stop; replace it through the approved secret manager.
- `403`: the integration lacks access or the required Insert/Update Content capability. Ask the workspace owner to connect/configure it.
- `404`: confirm the workspace connection and ID; resolve database IDs again.
- `400 validation_error`: re-fetch the schema and correct the exact property shape or select/status value.
