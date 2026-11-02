import { Component, ElementRef, EventEmitter, Input, Output, viewChild } from '@angular/core';

import { EmojiPicker } from '../emoji-picker/emoji-picker';

/**
 * Opens the shared reaction picker in the browser's top layer.
 *
 * Native popover positioning keeps the palette visible even when message
 * containers scroll or clip their children. Selection and visibility are
 * reported to the owning message component through output events.
 */
@Component({
  selector: 'app-reaction-popover',
  imports: [EmojiPicker],
  templateUrl: './reaction-popover.html',
  styleUrl: './reaction-popover.scss',
})
export class ReactionPopover {
  /** Template reference for the native popover element. */
  private readonly surface = viewChild<ElementRef<HTMLDivElement>>('surface');

  /** Recently selected emojis displayed before the full picker catalog. */
  @Input() recent: string[] = [];

  /** Emits the emoji selected by the user so the parent can apply the reaction. */
  @Output() readonly emojiSelected = new EventEmitter<string>();

  /** Notifies the parent when the native popover opens or closes. */
  @Output() readonly openedChange = new EventEmitter<boolean>();

  /**
   * Opens the native emoji palette and anchors it to the triggering button.
   *
   * @param anchor - Reaction button whose viewport position determines placement.
   */
  openAt(anchor: HTMLElement): void {
    const surface = this.surface()?.nativeElement;
    if (!surface) return;
    surface.showPopover();
    this.position(surface, anchor.getBoundingClientRect());
    this.openedChange.emit(true);
  }

  /**
   * Closes the currently open palette and resets parent visibility state.
   *
   * This also handles closing when the message pointer leaves its hover area.
   */
  close(): void {
    const surface = this.surface()?.nativeElement;
    if (surface?.matches(':popover-open')) surface.hidePopover();
    this.openedChange.emit(false);
  }

  /**
   * Synchronizes Angular state after the browser dismisses the native popover.
   *
   * @param event - Native toggle event emitted when the popover changes state.
   */
  onToggle(event: Event): void {
    this.openedChange.emit((event.target as HTMLElement).matches(':popover-open'));
  }

  /**
   * Emits the chosen emoji and dismisses the palette after selection.
   *
   * @param emoji - Unicode emoji string selected from the picker.
   */
  choose(emoji: string): void {
    this.emojiSelected.emit(emoji);
    this.close();
  }

  /**
   * Positions the palette above the trigger when space allows, otherwise below it.
   *
   * Both coordinates are clamped to a small viewport margin so the popover
   * remains reachable on narrow screens.
   *
   * @param surface - Rendered popover element receiving the CSS coordinates.
   * @param anchor - Trigger's viewport-relative bounding rectangle.
   */
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
