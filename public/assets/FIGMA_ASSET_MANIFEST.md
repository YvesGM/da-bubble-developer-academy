# Figma assets – status after final review

Existing vector assets are used directly from `public/assets/`. Do not rename them without updating their consumers.

## Present in the repository

`logo.svg`, `logo-name.svg`, `arrow-back.svg`, `default-profile-icon.svg`, `email-icon.svg`, `google-icon.svg`, `lock-icon.svg`, `person-icon.svg`, `add-channel.svg`, `add.svg`, `channel-hash.svg`, `channels.svg`, `chevron-down.svg`, `direct-messages.svg`, `edit.svg`, `search.svg`, `sidebar-collapse.svg`, `workspace-icon.svg`, and avatars `avatar1.svg` through `avatar6.svg`.

## Missing and still referenced by the application

Export the **original Figma symbols as SVG** and save under these exact names in `public/assets/`:

| File | Where needed |
| --- | --- |
| `close.svg` | Thread and channel/member dialogs |
| `add-member.svg` | Add channel members |
| `thread.svg` | Start a thread from message actions |
| `reaction-add.svg` | Open reaction picker |
| `emoji.svg` | Message composer |
| `mention.svg` | Message composer @ action |
| `send.svg` | Message composer send action |

Only these confirmed references are included here. Further files may be needed after complete template/asset validation. Never substitute arbitrary third-party icons for Figma originals.

The left sidebar's expansion state currently reuses `sidebar-collapse.svg` mirrored in CSS, because the original `sidebar-expand.svg` is missing. Export `sidebar-expand.svg` if the Figma variants are not exact mirrors.

Export as PNG only for actual bitmap artwork; do not convert ordinary line icons to PNG.
