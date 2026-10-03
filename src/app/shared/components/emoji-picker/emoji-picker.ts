import { Component, EventEmitter, Input, Output } from '@angular/core';

import { EMOJI_OPTIONS } from '../../../core/constants/emoji.constants';

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {
  @Input() recent: string[] = [];
  @Output() readonly emojiSelected = new EventEmitter<string>();

  readonly emojis = EMOJI_OPTIONS;

  options(): string[] {
    return [...new Set([...this.recent, ...this.emojis])];
  }
}
