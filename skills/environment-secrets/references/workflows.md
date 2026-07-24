# Environment Secrets — Workflows

`team-skills env` is the safe local interface to encrypted dotenvx configuration. It reports variable names and readiness only; it never prints secret values.

## First-time local setup

```bash
npm install
# Obtain .env.keys from the approved password manager or an existing developer.
# Save it at the project root. Never commit it.
npx team-skills env doctor
npx team-skills env run -- npm run dev
```

Local ciphertext is always `.env.local.enc`. Its name intentionally falls outside Next.js’s documented dotenv file set, so local Next commands must run through `team-skills env run`.

## Verify local configuration

```bash
npx team-skills env doctor
npx team-skills env validate
npx team-skills env check
```

- `doctor` reports local file presence, ciphertext status, public variable *names*, and actual decryption.
- `validate` compares the local file’s names with `.env.example`.
- `check` fails closed when the local key, decryption, or a required value is missing.

## Run locally and change a value

```bash
npx team-skills env run -- npm run dev
npx team-skills env run -- npm run build
npx team-skills env set SOME_KEY
```

`run` first performs a readiness check, decrypts the local file only into the child process, and never writes a plaintext dotenv file. `set` uses dotenvx’s masked prompt; never put a value in shell history, a command, a ticket, or chat.

## Vercel checklist

Before a Preview or Production deployment:

1. Start with the variable **names** in `.env.example`; keep values in the approved password manager or source system, not Git or chat.
2. Configure every name needed by the selected Vercel scope, including all build-time `NEXT_PUBLIC_*` values before `next build` begins.
3. Use isolated Preview data and integrations. Preview must not have credentials capable of mutating production services.
4. Confirm Vercel has neither `.env.keys` nor any `DOTENV_PRIVATE_KEY*` value.
5. Keep staged Production and explicit promotion controls in place; test the resulting Preview before considering a Production promotion.

In Vercel, `team-skills env run -- <command>` is a strict pass-through. It does not require, read, validate, or decrypt `.env.local.enc`; Vercel Environment Variables are the sole hosted source of configuration.

## Key rotation and recovery

If a local dotenvx private key may have been exposed, rotate the underlying credentials as well as the encryption key, then distribute replacement key material through the approved password manager. If `.env.keys` is unavailable, recover only from an approved backup or password manager—never reconstruct, commit, or paste it into documentation or chat.

## Troubleshooting

| Symptom | Safe next step |
|---|---|
| `.env.local.enc not found` | Obtain the committed ciphertext from the repository; do not substitute a plaintext dotenv file. |
| Local decryption fails | Compare the private key source privately, then run `env doctor` again. |
| Hosted build lacks a public value | Add that variable in the relevant Vercel scope, then trigger a fresh build. |
| Preview can reach production data | Stop rollout and replace the Preview integration with isolated credentials/data. |

## See also

- [SKILL.md](../SKILL.md)
- [dotenvx documentation](https://dotenvx.com/docs)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
