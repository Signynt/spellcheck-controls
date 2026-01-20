# Spellcheck Controls for Obsidian

Control which files have spellcheck enabled based on folders, tags, frontmatter properties, or Dataview queries.

This plugin allows you to define granular rules to automatically enable or disable the spellchecker in Obsidian. This is particularly useful for:
- Disabling spellcheck in code-heavy notes.
- Disabling spellcheck in specific folders (e.g. `Templates/` or `Logs/`).
- Enabling spellcheck only for certain project tags (e.g. `#status/draft`).
- Controlling spellcheck based on a frontmatter property (e.g. `lang: de`).

## Features

- **Rule-based Control**: Create ordered rules to determine spellcheck state. First matching rule wins.
- **Multiple Conditions**:
  - **Folder**: Match files in specific folders (recursive or exact).
  - **Tag**: Match files with specific tags (supports nested tags).
  - **Property**: Match files with specific frontmatter keys or values.
  - **Dataview**: Match files returned by a specific Dataview query.
- **Logic**: Support for negation (e.g., "NOT in folder X").
- **Dynamic Updates**:
  - Updates when switching active files.
  - Updates when file metadata (tags/frontmatter) changes.

## Usage

1. Go to **Settings > Spellcheck Controls**.
2. Click **Add new rule**.
3. Configure the rule:
   - **Name**: Give it a descriptive name (e.g., "Disable in Templates").
   - **Enabled**: Toggle to temporarily disable the rule without deleting it.
   - **Rule Type**: Select Folder, Tag, Property, or Dataview.
   - **Condition**: specific details (e.g., the folder path or tag name).
   - **Enable Spellcheck**: Choose whether spellcheck should be **ON** or **OFF** when this rule matches.
4. Rules are evaluated from top to bottom. The first rule that matches the current file will determine the spellcheck setting.
   - You can reorder rules using the Up/Down arrows.
   - If no rule matches, Obsidian's global spellcheck setting (or previous state) generally persists, but the plugin defaults to keeping it enabled if no disabling rules match.

### Examples

**Scenario 1: Disable in Templates**
- **Type**: Folder
- **Path**: `Templates/`
- **Recursive**: On
- **Enable Spellcheck**: OFF

**Scenario 2: Enable only for Drafts**
- **Type**: Tag
- **Tag**: `status/draft`
- **Enable Spellcheck**: ON

**Scenario 3: Disable for Code Snippets**
- **Type**: Property
- **Property Name**: `type`
- **Property Value**: `code`
- **Enable Spellcheck**: OFF

## Installation

### Manually
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release (if available).
2. Copy these files to your vault's plugin folder: `.obsidian/plugins/spellcheck-controls/`.
3. Reload Obsidian.
4. Enable "Spellcheck Controls" in Community Plugins settings.

### Development
1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start compilation in watch mode.

## Compatibility

Requires Obsidian v0.15.0+.

## License

MIT
