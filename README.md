# PS5 Widget Store

A GitHub-hosted catalog for custom PS5 Welcome Hub widgets. The Widget Store tile reads `catalog.json` and downloads individual files from the same repository. ZIP files are not required.

## Repository layout

Keep each widget's install files in a folder named after its catalog ID:

```text
catalog.json
store-smoke-icon.png
screenshots/<widget-id>-1.png
widgets/<widget-id>/config.json
widgets/<widget-id>/widget.js
widgets/<widget-id>/icon.png        # optional
```

Each catalog entry contains a `files` array of repository-relative paths. Include `config.json` and `widget.js`; list any additional files the widget needs. Install files are placed directly in `/data/wh-widgets/<id>/`, so filenames must be unique within that widget folder. Current bridge limits are 16 files, 2 MB per file, and 8 MB total per widget.

## Screenshots

Developers can upload PNG, JPG, JPEG, or WebP previews anywhere in the repository, then list the paths in `screenshots`. The Store shows up to eight images in the widget details screen. Paths are relative to the repository root; a label can be supplied with an object:

```json
"screenshots": [
  "screenshots/my-widget-1.png",
  { "url": "screenshots/my-widget-2.jpg", "label": "Settings screen" }
]
```

Screenshots are previews only and do not need to be included in the widget's `files` list.

## Catalog entry

```json
{
  "id": "my-widget",
  "title": "My Widget",
  "description": "What it does.",
  "category": "Tools",
  "version": "1.0.0",
  "files": ["widgets/my-widget/config.json", "widgets/my-widget/widget.js"],
  "screenshots": ["screenshots/my-widget-1.png"],
  "icon": "my-widget-icon.png"
}
```

The `files` list is fetched from GitHub and installed into `/data/wh-widgets/<id>/`. The bridge validates the directory name against `config.json` before committing the installation. Submit widgets only when their authors permit redistribution and the package has been reviewed.

