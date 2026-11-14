# PS5 Widget Store

A GitHub-hosted catalog for custom PS5 Welcome Hub widgets. The Widget Store tile reads `catalog.json` and downloads individual files from this repository. Packages use ordinary files; ZIP archives are not required.

## Repository layout

```text
catalog.json
screenshots/<widget-id>-1.png
widgets/<widget-id>/config.json
widgets/<widget-id>/widget.js
widgets/<widget-id>/<required assets>
```

Each catalog entry lists every required install file in its `files` array. Files are installed directly into `/data/wh-widgets/<id>/`, so filenames must be unique within each widget folder. The current bridge accepts up to 16 files, 2 MB per file, and 8 MB total per widget.

## Included widgets

- Widget Store, Calculator, Blockris, PS5 News, Snake, Widget Manager, and Weather.
- Dev Test is an experimental system-URI launcher. Some entries are unstable or developer-only.
- Weather starts without a built-in ZIP; enter a ZIP code in the tile's Options menu.

## Screenshots

Upload PNG, JPG, JPEG, or WebP previews and list their repository-relative paths in `screenshots`. The Store shows up to eight images in a widget's details screen. Screenshots are previews only and do not belong in the package's `files` list.

```json
"screenshots": [
  "screenshots/my-widget-1.png",
  { "url": "screenshots/my-widget-2.jpg", "label": "Settings screen" }
]
```

## Catalog entry

```json
{
  "id": "my-widget",
  "title": "My Widget",
  "description": "What it does.",
  "category": "Tools",
  "version": "1.0.0",
  "files": ["widgets/my-widget/config.json", "widgets/my-widget/widget.js"],
  "screenshots": [],
  "icon": "widgets/my-widget/icon.png"
}
```

Only publish packages whose authors permit redistribution. Review each package before adding it to the catalog.

## Landing page

The catalog preview site is published with GitHub Pages at [Widget Store](https://manchildtechnologies-ui.github.io/ps5-widget-store/). The repository uses GitHub Actions for Pages deployment. Each listing supports a direct detail link using `?widget=<catalog-id>`.
