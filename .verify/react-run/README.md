# React SSR / hydration harness

This is how `RamazanskoOdbrojavanje.tsx` was verified: type-checked under `strict`,
bundled, server-rendered, and hydrated in headless Chromium — asserting zero
hydration mismatches, the static fallback in the server HTML, live ticking, and
timezone switching.

The React/UMD libraries and build output are not committed here. To rebuild:

```bash
P=/home/dzenan/deepseek-harness/node_modules/.pnpm
R=$P/react@18.3.1/node_modules/react
RD=$P/react-dom@18.3.1_react@18.3.1/node_modules/react-dom
TR=$P/@types+react@18.3.31/node_modules/@types/react
ESB=$P/esbuild@0.25.12/node_modules/esbuild/bin/esbuild
TSC=/home/dzenan/deepseek-harness/node_modules/.bin/tsc

mkdir -p node_modules/@types
ln -sfn $R node_modules/react && ln -sfn $RD node_modules/react-dom
ln -sfn $TR node_modules/@types/react
cp ../../RamazanskoOdbrojavanje.tsx ../../ramazan-odbrojavanje.css .

$TSC -p tsconfig.json                       # strict type check
$ESB --bundle entry.tsx --tsconfig=tsconfig.build.json \
     --alias:react=$PWD/react-global-shim.js \
     --outfile=bundle.js --format=iife --loader:.css=css

cp $R/umd/react.development.js \
   $RD/umd/react-dom.development.js \
   $RD/umd/react-dom-server-legacy.browser.development.js .
python3 run.py                              # opens ssr.html, prints the report
```

`ssr.html` renders to string, injects it, hydrates, and reports any
`console.error` from React — a hydration mismatch shows up there.
