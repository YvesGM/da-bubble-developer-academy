import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-workspace-name-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './workspace-name-dialog.html',
  styleUrl: './workspace-name-dialog.scss',
})
export class WorkspaceNameDialog {
  private readonly formBuilder = inject(FormBuilder);

  @Input() set workspaceName(value: string) {
    this.form.controls.workspaceName.setValue(value || 'Workspace');
  }
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly saveRequested = new EventEmitter<string>();

  readonly errorMessage = signal('');
  readonly form = this.formBuilder.nonNullable.group({
    workspaceName: ['Workspace', Validators.required],
  });

  submit(): void {
    const value = this.form.controls.workspaceName.value.trim();
    if (!value) return this.markInvalid();
    this.saveRequested.emit(value);
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please enter a workspace name.');
  }
}
