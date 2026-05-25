<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## First time setup
```sh
cd /Users/fonz.morris/fonz.sh/bcc-lxp
pnpm install
cp .env.local.example .env.local  # and fill in creds
pnpm dev
```

## Fresh pull to start a session
```sh
cd /Users/fonz.morris/fonz.sh/bcc-lxp
git pull
pnpm install
pnpm dev
```
