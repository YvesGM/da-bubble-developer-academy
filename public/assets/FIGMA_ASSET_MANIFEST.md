# Figma Asset Manifest

This file defines the local asset names expected for the final DABubble Figma pass.

Do not rename existing assets unless the consuming code is updated at the same time.

## Existing assets — already present

- `logo.svg`
- `logo-name.svg`
- `arrow-back.svg`
- `default-profile-icon.svg`
- `email-icon.svg`
- `google-icon.svg`
- `lock-icon.svg`
- `person-icon.svg`
- `avatars/avatar1.svg`
- `avatars/avatar2.svg`
- `avatars/avatar3.svg`
- `avatars/avatar4.svg`
- `avatars/avatar5.svg`
- `avatars/avatar6.svg`

## Assets still to export from Figma

Export these as SVG and place them directly in `public/assets/` using exactly these filenames.

### Global / navigation

- `chevron-down.svg`
  - dropdown indicators
  - channel section expand indicator
  - profile menu indicator

- `sidebar-collapse.svg`
  - desktop workspace sidebar collapse control

- `sidebar-expand.svg`
  - collapsed workspace sidebar reopen control

- `close.svg`
  - dialogs, profile cards, thread panel
  - Figma component seen as `45. Close`

- `add.svg`
  - generic plus action
  - channel creation / new DM action

- `search.svg`
  - global workspace search field

### Channel / members

- `channel-hash.svg`
  - Figma channel/tag symbol where an icon is used instead of text `#`

- `add-member.svg`
  - channel header member-add action

- `edit.svg`
  - channel/profile edit actions

### Messaging

- `thread.svg`
  - hover action for starting/opening a thread

- `reaction-add.svg`
  - additional reaction action
  - Figma component seen as `59. add reaction`

- `emoji.svg`
  - composer emoji-picker action when Figma uses a dedicated icon

- `send.svg`
  - message send action

- `delete.svg`
  - own-message delete action if shown as icon in the final Figma frame

### Profile / account

- `mail.svg`
  - profile e-mail row when using the Figma profile icon
  - keep `email-icon.svg` for auth forms unless the final Figma comparison shows both are identical

- `logout.svg`
  - mobile account menu logout icon if present in the selected Figma frame

## Naming rules

- lowercase
- kebab-case
- SVG for all UI icons
- no spaces
- no Figma-generated suffixes
- no inline SVG path data in Angular templates
- components reference files as `/assets/<filename>.svg`

## Before final Figma implementation

For every downloaded asset verify:

1. The exported asset corresponds to the exact Figma component/layer.
2. The filename matches this manifest exactly.
3. The SVG still contains its original Figma width/height/viewBox.
4. Do not manually redraw or substitute a different icon.
5. Tell ChatGPT which files have been added before the final icon-wiring pass.

## Current text placeholders that will be replaced once assets exist

Current implementation still contains visual placeholders such as:

- `⌄`
- `‹`
- `›`
- `＋`
- `←` in places where `arrow-back.svg` should be used
- `☺`
- text action `Thread`
- text actions `Bearbeiten` / `Löschen` where Figma uses icons

These are intentionally not replaced until the corresponding exact Figma SVGs are available.
