import { Component, ElementRef, HostListener, EventEmitter, Input, Output, afterNextRender, signal, viewChild } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

/** Members and guest-access preference submitted when changing channel access. */
export interface AddMembersSelection {
  memberIds: string[];
  guestAccess: boolean;
}

/**
 * Selects registered users or guest access to add to an existing channel.
 *
 * Search and selection state are local to the dialog; confirmation returns a
 * structured selection to the channel view without mutating membership itself.
 */
@Component({
  selector: 'app-add-members-dialog',
  imports: [InputCaretDirective, Avatar, PresenceIndicator],
  templateUrl: './add-members-dialog.html',
  styleUrl: './add-members-dialog.scss',
})
export class AddMembersDialog {
  /** Member search field that receives focus when the dialog opens. */
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('memberSearch');
  /** Workspace user profiles used to resolve visible names and avatar data. */
  @Input() users: UserProfile[] = [];
  /** Whether guest access can be added to this channel. */
  @Input() guestAvailable = false;
  /** Current channel name shown between the heading and member search. */
  @Input() channelName = '';
  /** Viewport offsets of the add-member button for popover placement. */
  @Input() position: { top: number; right: number } = { top: 100, right: 24 };
  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Emits the add-members action to the owning channel view. */
  @Output() readonly addRequested = new EventEmitter<AddMembersSelection>();

  /** Current search or mention query typed by the user. */
  readonly query = signal('');
  /** UIDs currently selected for inclusion in the channel. */
  readonly selectedIds = signal(new Set<string>());
  /** Whether the guest-access option is selected. */
  readonly guestSelected = signal(false);

  /** Schedules focus on the member search field after the dialog renders. */
  constructor() {
    afterNextRender(() => this.searchInput()?.nativeElement.focus());
  }

  /** Closes the member selection dialog via Escape. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeRequested.emit();
  }

  /**
   * Filters available users by the current search query.
   *
   * @returns Matching profiles not already selected, after three typed characters.
   */
  filteredUsers(): UserProfile[] {
    const value = this.searchTerm();
    if (value.length < 3) return [];
    return this.users.filter((user) =>
      !this.selectedIds().has(user.uid) && user.displayName.toLowerCase().includes(value),
    );
  }

  /** @returns Whether a sufficiently specific query can display suggestions. */
  showSuggestions(): boolean {
    return this.searchTerm().length >= 3;
  }

  /** @returns Whether the optional guest suggestion matches the current query. */
  matchesGuest(): boolean {
    return this.guestAvailable && !this.guestSelected()
      && 'gast'.includes(this.searchTerm());
  }

  /** @returns Lowercase search text without an optional mention marker. */
  private searchTerm(): string {
    return this.query().trim().replace(/^@/, '').toLowerCase();
  }

  /**
   * Resolves the currently selected member identifiers to user profiles.
   *
   * @returns The selected user profiles.
   */
  selectedUsers(): UserProfile[] {
    return this.users.filter((user) => this.selectedIds().has(user.uid));
  }

  /**
   * Adds or removes a user from the pending member selection.
   *
   * @param uid - Firebase user identifier to toggle.
   */
  toggleUser(uid: string): void {
    const selected = new Set(this.selectedIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedIds.set(selected);
    this.query.set('');
  }

  /** Toggles optional guest access and clears the completed search. */
  toggleGuest(): void {
    this.guestSelected.update((selected) => !selected);
    this.query.set('');
  }

  /**
   * Emits the selected members and guest-access setting to the parent component.
   */
  submit(): void {
    this.addRequested.emit({
      memberIds: [...this.selectedIds()],
      guestAccess: this.guestSelected(),
    });
  }

  /**
   * Determines whether the current selection contains a meaningful change.
   *
   * @returns Whether the dialog can submit its current selection.
   */
  canSubmit(): boolean {
    return this.selectedIds().size > 0 || this.guestSelected();
  }
}
