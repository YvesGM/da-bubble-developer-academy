import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
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
  @Input() creatorName = 'Unknown user';
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly saveRequested = new EventEmitter<UpdateChannelInput>();
  @Output() readonly leaveRequested = new EventEmitter<void>();

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saveRequested.emit(this.form.getRawValue());
  }
}
