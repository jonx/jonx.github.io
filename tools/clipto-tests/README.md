# ClipTo Web browser checks

From this directory:

```sh
npm ci
npx playwright install chromium webkit
npm test
```

The suite serves the repository on localhost port 8812 and exercises the real
`/clipto/` path in Chromium and WebKit. Clipboard reads and writes are simulated;
the tests never replace the system clipboard. Coverage includes conversion,
malicious HTML, permission failures, multiple clipboard items, language switching,
asset versions and mobile layout.
