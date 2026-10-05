import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Channel, UpdateChannelInput } from '../../../../core/models/channel.model';

@Component({
  selector: 'app-channel-details-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './channel-details-dialog.html',
  styleUrl: './channel-details-dialog.scss',
})
export class ChannelDetailsDialog {
  private readonly formBuilder = inject(FormBuilder);

  @Input({ required: true }) set channel(value: Channel) {
    this.form.setValue({ name: value.name, description: value.description });
  }
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

  /**
   * Validates and emits the edited channel name together with the current description.
   */
  saveName(): void {
    if (this.form.controls.name.invalid) return this.form.controls.name.markAsTouched();
    this.saveRequested.emit(this.form.getRawValue());
    this.editingName.set(false);
  }

  /**
   * Emits the edited channel description together with the current channel name.
   */
  saveDescription(): void {
    this.saveRequested.emit(this.form.getRawValue());
    this.editingDescription.set(false);
  }
}
