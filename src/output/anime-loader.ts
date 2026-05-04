// Anime.js used to ship as a separate UMD <script> here, with the runtime
// reading it back through `globalThis.anime`. The runtime now inlines the
// tree-shaken subset directly (see `src/runtime/_anime.ts` + the build's
// dropped `external: ['animejs']`), so this loader returns an empty string
// and the call site in `output/html.ts` emits a no-op `<script></script>`.
// Kept as a single function rather than ripped out so the html.ts call site
// stays in scope of the bundle-size-audit branch.
export async function loadAnimeJs(): Promise<string> {
  return '';
}
