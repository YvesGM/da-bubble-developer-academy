import { Component, ElementRef, EventEmitter, Input, Output, viewChild } from '@angular/core';

import { EmojiPicker } from '../emoji-picker/emoji-picker';

/** An emoji palette in the browser top layer, outside scroll-container clipping. */
@Component({
  selector: 'app-reaction-popover',
  imports: [EmojiPicker],
  templateUrl: './reaction-popover.html',
  styleUrl: './reaction-popover.scss',
})
export class ReactionPopover {
  private readonly surface = viewChild<ElementRef<HTMLDivElement>>('surface');
  @Input() recent: string[] = [];
  @Output() readonly emojiSelected = new EventEmitter<string>();
  @Output() readonly openedChange = new EventEmitter<boolean>();

  /** Opens the palette at its clicked reaction button. */
  openAt(anchor: HTMLElement): void {
    const surface = this.surface()?.nativeElement;
    if (!surface) return;
    surface.showPopover();
    this.position(surface, anchor.getBoundingClientRect());
    this.openedChange.emit(true);
  }

  /** Dismisses the palette, including on message mouseleave. */
  close(): void {
    const surface = this.surface()?.nativeElement;
    if (surface?.matches(':popover-open')) surface.hidePopover();
    this.openedChange.emit(false);
  }

  /** Syncs state after native light-dismiss (click outside or Escape). */
  onToggle(event: Event): void {
    this.openedChange.emit((event.target as HTMLElement).matches(':popover-open'));
  }

  /** Propagates the selected reaction and closes its palette. */
  choose(emoji: string): void {
    this.emojiSelected.emit(emoji);
    this.close();
  }

  /** Positions above the trigger where possible, clamped to the viewport. */
  private position(surface: HTMLDivElement, anchor: DOMRect): void {
    const bounds = surface.getBoundingClientRect();
    const above = anchor.top - bounds.height - 8;
    const desiredTop = above >= 8 ? above : anchor.bottom + 8;
    const top = Math.max(8, Math.min(desiredTop, window.innerHeight - bounds.height - 8));
    const left = Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8));
    surface.style.top = `${top}px`;
    surface.style.left = `${left}px`;
  }
}
