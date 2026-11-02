import { Component, HostListener, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Channel, UpdateChannelInput } from '../../../../core/models/channel.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { ChannelMembersContent } from '../channel-members-content/channel-members-content';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

/**
 * Displays and edits channel metadata inside the details dialog.
 *
 * The component owns only the editing form and emits changes to its parent,
 * while member rows and the leave-channel action remain accessible.
 */
@Component({
  selector: 'app-channel-details-dialog',
  imports: [InputCaretDirective, ReactiveFormsModule, ChannelMembersContent],
  templateUrl: './channel-details-dialog.html',
  styleUrl: './channel-details-dialog.scss',
})
export class ChannelDetailsDialog {
  /** Angular form builder used to create typed and validated controls. */
  private readonly formBuilder = inject(FormBuilder);

  /**
   * Refreshes the editor when a different channel is displayed.
   *
   * @param value - Channel whose name and description populate the form.
   */
  @Input({ required: true }) set channel(value: Channel) {
    this.form.setValue({ name: value.name, description: value.description });
    this.editingName.set(false);
    this.editingDescription.set(false);
  }
  /** Viewport coordinates controlling the contextual dialog's placement. */
  @Input() position = { top: 120, left: 24 };
  /** Display name of the user who created this channel. */
  @Input() creatorName = 'Unbekannter Benutzer';
  /** Profiles currently belonging to the selected channel. */
  @Input() members: UserProfile[] = [];
  /** UID of the current account, used to mark the user's own row. */
  @Input() currentUserId = '';
  /** Whether this channel allows anonymous guest participation. */
  @Input() guestAccess = false;
  /** Whether the current account may invite additional members. */
  @Input() canAdd = true;
  /** Human-readable error currently shown in the form. */
  @Input() errorMessage = '';
  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Emits changed channel name or description for persistence. */
  @Output() readonly saveRequested = new EventEmitter<UpdateChannelInput>();
  /** Requests removal of the current user from the channel. */
  @Output() readonly leaveRequested = new EventEmitter<void>();
  /** Emits the add-members action to the owning channel view. */
  @Output() readonly addRequested = new EventEmitter<void>();
  /** Emits a member profile selected in the list or dialog. */
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  /** Whether the channel name field is currently in edit mode. */
  readonly editingName = signal(false);
  /** Whether the channel description is currently in edit mode. */
  readonly editingDescription = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  /** Closes the channel details dialog via Escape. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeRequested.emit();
  }

  /**
   * Validates and emits the edited channel name together with the current description.
   */
  saveName(): void {
    if (this.form.controls.name.invalid) return this.form.controls.name.markAsTouched();
    this.saveRequested.emit(this.form.getRawValue());
  }

  /**
   * Emits the edited channel description together with the current channel name.
   */
  saveDescription(): void {
    this.saveRequested.emit(this.form.getRawValue());
  }
}
