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

  /**
   * Validates the workspace-name form and emits the trimmed value when valid.
   */
  submit(): void {
    const value = this.form.controls.workspaceName.value.trim();
    if (!value) return this.markInvalid();
    this.saveRequested.emit(value);
  }

  /**
   * Marks the workspace-name control as touched and exposes the validation state.
   */
  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib einen Workspace-Namen ein.');
  }
}
