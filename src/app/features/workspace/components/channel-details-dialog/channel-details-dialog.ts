import { Component, HostListener, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Channel, UpdateChannelInput } from '../../../../core/models/channel.model';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

/** Displays and manages channel details and settings. */
@Component({
  selector: 'app-channel-details-dialog',
  imports: [InputCaretDirective, ReactiveFormsModule],
  templateUrl: './channel-details-dialog.html',
  styleUrl: './channel-details-dialog.scss',
})
export class ChannelDetailsDialog {
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
  @Input() position = { top: 120, left: 24 };
  @Input() creatorName = 'Unbekannter Benutzer';
  @Input() errorMessage = '';
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly saveRequested = new EventEmitter<UpdateChannelInput>();
  @Output() readonly leaveRequested = new EventEmitter<void>();

  readonly editingName = signal(false);
  readonly editingDescription = signal(false);
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
