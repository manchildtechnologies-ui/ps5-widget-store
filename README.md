# PS5 Widget Store

A GitHub-hosted catalog for custom PS5 Welcome Hub widgets. The Widget Store tile reads `catalog.json`.

## Smoke test

`store-smoke-0.1.0.zip` is a tiny, harmless test widget. Its tile displays a confirmation message only. `catalog.json` includes the package URL and SHA-256.

## Installer status

The current WHBridge serves assets and stores per-widget settings, but does not write or extract widget packages. The Widget Store prototype can browse the catalog; installing from the tile remains unavailable until a bridge installer is implemented and tested.

## Adding widgets

Add each release to `catalog.json` with a stable ID, title, description, category, version, package URL, and SHA-256. Keep packages self-contained with `config.json` and `widget.js` in an ID-named folder at the archive root. Add widgets only when their authors permit redistribution and the package has been reviewed.
