# Corpse Ledger

A stock-aware **Graveyard Keeper 2** burial planner. Runs entirely in the browser, with TanStack Start + Vite, React, Zustand, Tailwind CSS, shadcn-style UI components, and the MIT-licensed HiGHS WebAssembly mixed-integer optimizer.

[Live calculator](https://anguzo.github.io/gk2-corpse-calc/) · [Deploy workflow](https://github.com/anguzo/gk2-corpse-calc/actions/workflows/deploy-pages.yml) · [MIT license](LICENSE)

## Run

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. The initial ledger contains the supplied four-corpse example: three bodies with four flesh and one with three flesh. The default alchemy setting is four gold injections, at most one per body. Solutions and organ improvers begin disabled.

## Using the planner

1. Remove fat and blood. Enter reusable organ quantities in **Stash**. The model rebuilds organ slots from this shared stash; it does not track already-installed organs or surgery failures.
2. The stash has **36 predefined game variants**, six for each organ. Skull values and grades are fixed. Only quantity and unlimited supply are editable. Filter by organ or “In stock only” to find variants quickly.
3. Enter each corpse’s retained flesh. Other retained pocket items and their fixed skull contributions can be entered in its expandable section. Flesh is counted separately; fixed fields are not for already-installed organs.
4. In **Alchemy**, enable the grades of solutions and injections you can use. Enter finite bottle stock or enable free crafting. Set per-corpse limits, including repeated treatments if desired.
5. Enable **White Organ Improver** if available. Each upgrade consumes one donor from the stash and one improver and produces the canonical gold-grade output for that organ kind.
6. Set Anatomy mastery and optimization goal, then **Calculate best plan**. **Autopsy** shows the instructions, upgrades, bottles, before/after skull totals, pocket usage, and useful reserves by organ type.

The ledger persists in localStorage under `corpse-ledger-v1` (schema version 2). Valid stock from the earlier free-form editor is migrated into the predefined catalog, and duplicate matching variants are merged. Plans are calculated on demand and are marked stale after any input changes. Calculation does not deduct inventory.

## Optimization

One joint mixed-integer model assigns resources across all corpses. It enforces:

- At most one organ per kind per body. Unneeded organ slots may stay empty for burial.
- Global organ, bottle, and improver stock limits.
- Safe Anatomy requirements for each insertion, including upgraded gold organs.
- Six pockets per body, shared by flesh, other retained pocket items, and all bottles.
- Final white at or above the configured target and red at zero (negative raw red clamps to zero).
- Per-treatment, per-corpse bottle limits.

Default **Balanced stash** objectives are solved in order:

1. Maximum number of ready corpses.
2. **Maximum lowest useful organ-type reserve** after allocation, protecting the bottleneck.
3. **Minimum depletion pressure** across types and variants, favoring abundant resources and avoiding nearly empty stacks.
4. Minimum combined conservation and alchemy costs.
5. Minimum excess white skulls.
6. Minimum total inserted organs and bottles.

For depletion pressure, each successive finite organ costs `round(10000 / remaining type stock)` plus `round(1000 / remaining variant stock)`, with a minimum of 1 per term. These rising costs are modeled as ordered binary ladders, so depleting the last few organs is more expensive than taking from a plentiful stack.

**Useful stock** means organs that can contribute white with the current Anatomy and alchemy access, or eligible white-improver donors. Unusable zero-white organs do not inflate flexibility. Initially empty types are excluded from the bottleneck calculation; unlimited useful types are not scarce. Donor eligibility is potential, not a promise that all donors can be improved: actual upgrade assignments still obey the shared improver budget. Type reserve counts count organs, not skull points.

Alternative goals skip reserve balancing and minimize organ resources before alchemy, or alchemy before organs. The grade conservation tie-break costs are 1 / 2 / 5 / 10 for ordinary / bronze / silver / gold, **not game market prices**. Bottle/improver cost weights remain adjustable. Preserving stock can justify an extra white skull because excess is a later objective.

There can be several equally optimal allocations. Each solver stage has a 15-second limit; a feasible timed-out result is labeled “best found” instead of “optimal.” HiGHS runs in a dedicated browser worker; its WebAssembly binary is bundled locally. Each returned solver allocation is checked against every model constraint before being accepted. The supplied example's balanced plan retains at least four usable organs of every initially stocked useful type while preparing all four corpses.

## Game rules and sources

Research date: **October 8, 2026**. Sources use game build `4599483364566526977`:

- [GK2DB: Corpses and Organs, Part by Part](https://gk2db.org/guides/corpses-and-organs/)
- [GK2DB: All organ variants](https://gk2db.org/items/corpse/)
- [Embalming Table I: pocket limit and how mixtures are inserted](https://graveyardkeeper2.io/buildings/embalm_table_1/)
- [Injection for Corpses: effects by grade and crafting ingredients](https://graveyardkeeper2.io/items/embalm_white_red--1/)

**Solutions and injections can share separate pockets, and repeated bottles are allowed**, according to the database’s analysis of the game code. Its multi-bottle perfect-grave strategy is marked **unconfirmed in play**, which the app also discloses. Four flesh leaves only two pockets for bottles; three flesh leaves three.

White improvers replace any donor grade with a top-grade variant:

| Organ | White | Red | Anatomy needed to insert |
|---|---:|---:|---:|
| Skin | 3 | 1 | 6 |
| Bones | 3 | 1 | 7 |
| Skull | 3 | 0 | 8 |
| Heart | 3 | 0 | 13 |
| Brain | 3 | 0 | 13 |
| Guts | 3 | 1 | 13 |

## Checks and static deployment

```sh
npm run check
npm test
npm run build
npm run check:pages
npm run serve:static
```

Static prerendering is enabled in `vite.config.ts`. The build produces **`dist/client/index.html`** and client assets. Deploy **`dist/client/`** to a static host; no backend is needed. `serve:static` serves those files locally on port 3000. Stop the development server before using the same port. TanStack also emits `dist/server/`, but this single-page calculator only needs the prerendered client output for static hosting.

### GitHub Pages (manual deployment)

The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
has **only `workflow_dispatch`**, so pushing commits does not automatically deploy.

1. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions** (already configured for this repository).
2. Open **Actions → Deploy GitHub Pages → Run workflow**, choose `main`, and run it.
3. The workflow installs Node 24 and locked npm dependencies, checks types and tests, prerenders the app, verifies the static output, and deploys it using the official Pages actions.
4. The site URL appears in the deployment summary and the `github-pages` environment.

The workflow reads Pages' configured `base_path`, so project sites under
`/<repository>/` and root/custom-domain sites both work. Vite assets, Router's
basepath, icons, home links, worker scripts, and WebAssembly all respect the
base. To reproduce this repository's Pages build locally in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/gk2-corpse-calc/'
npm run build
npm run check:pages
npm run preview:pages
Remove-Item Env:VITE_BASE_PATH
```

The artifact contains `.nojekyll`, project and dependency licenses, original
icons, and the bundled solver. No GitHub secret beyond the automatic
`GITHUB_TOKEN` is required. Deployment permissions are restricted to the
deployment job. The checkout step retrieves LFS objects if licensed binary
assets are added in the future.

`preview:pages` serves only the static artifact at the chosen base path on
http://127.0.0.1:3002. It deliberately has no backend or SPA fallback, so missing
assets and incorrect repository paths produce real 404s.

Tests cover reserve balancing, scarce-type and scarce-variant protection, unlimited donor use, useful stock, exact game catalog and migration, the example's resource-minimum alternative, repeated/mixed bottles, pocket capacity, shared inventory, Anatomy, improvers, priorities, red removal, timeouts, and an empty batch.

## Visuals & assets

The compact Stash / Alchemy / Autopsy interface uses walnut-brown panels, moss-green accents, ochre frames, and **original MIT-licensed pixel icons**. Gold hearts, brains, and guts have darker variants; other organs use tier-colored frames and quality markers. All published images are local SVGs in `static/icons/`, with crisp-edge pixel rendering.

The layout was informed by the [Graveyard Factory planner](https://graveyard-factory.runoverlabs.dev/) and the game's Steam screenshots. **Extracted game art is not distributed**: no redistribution grant was verified. The older local `public/` directory is ignored and is not Vite's public directory; only `static/` is copied into builds. The original replacement icons are drawn from our own geometric pixel patterns, not traced or adapted from the game. To regenerate them:

```sh
npm run icons:generate
```

## Layout

```text
src/lib/          Domain types, sourced game rules, optimizer, tests
src/store/        Persisted Zustand ledger
src/components/   Inventory, alchemy, batch, plans, rules, UI primitives
src/routes/       TanStack Start document and calculator route
```

## Licensing & Git LFS

Original application code, documentation, and original SVG illustrations are
licensed under **MIT**; see [LICENSE](LICENSE). Dependencies retain their own
licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Full installed
dependency license texts and the project's license are included in every static
build. The optimizer uses MIT-licensed `highs`, replacing the earlier GPL-3.0
GLPK.js dependency.

Game names/trademarks belong to Lazy Bear Games / tinyBuild; no endorsement is
implied. The MIT license does not grant rights to third-party game assets.

`.gitattributes` routes binary artwork, fonts, and any checked-in WebAssembly to
**Git LFS**. SVGs are small text sources and stay in ordinary Git. There are no
binary art files or prebuilt solver binaries to upload in this release; the
solver comes from the locked npm package at build time. Contributors should run
`git lfs install` after cloning before adding any licensed binary assets. Any
future asset must have a redistribution license or documented permission.
