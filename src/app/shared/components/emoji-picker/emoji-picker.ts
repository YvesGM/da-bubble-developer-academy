import { Component, EventEmitter, Input, Output } from '@angular/core';

import { EMOJI_OPTIONS } from '../../../core/constants/emoji.constants';

/**
 * Renders the reusable emoji catalog for composing messages and reactions.
 *
 * Recent choices appear first without duplicating entries from the shared
 * catalog. Selection is returned to the parent through `emojiSelected`.
 */
@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {
  /** Recently selected emoji characters, ordered newest first by the parent. */
  @Input() recent: string[] = [];

  /** Emits the selected Unicode emoji character to the owning control. */
  @Output() readonly emojiSelected = new EventEmitter<string>();

  /** Shared catalog of emoji options available to every picker instance. */
  readonly emojis = EMOJI_OPTIONS;

  /**
   * Combines recent choices with the shared emoji catalog without duplicates.
   *
   * The first occurrence wins, preserving the parent's recent-emoji order
   * before all remaining options in the default catalog.
   *
   * @returns Unique emoji strings in the order presented by the picker.
   */
  options(): string[] {
    return [...new Set([...this.recent, ...this.emojis])];
  }
}
