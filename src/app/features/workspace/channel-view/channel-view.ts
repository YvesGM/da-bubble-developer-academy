import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { ChannelNameTakenError } from '../../../core/errors/channel-name-taken.error';
import { ChannelService } from '../../../core/services/channel.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-channel-view',
  imports: [ReactiveFormsModule],
  templateUrl: './channel-view.html',
  styleUrl: './channel-view.scss',
})
export class ChannelView {
  private readonly auth = inject(Auth);
  private readonly channels = inject(ChannelService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UserService);

  readonly channelId = toSignal(this.route.paramMap.pipe(map((params) => params.get('channelId') ?? '')), {
    initialValue: '',
  });
  readonly channel = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('channelId') ?? ''),
      switchMap((id) => this.channels.observeChannel(id)),
    ),
  );
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly members = computed(() => this.users().filter((user) => this.channel()?.memberIds.includes(user.uid)));
  readonly availableUsers = computed(() =>
    this.users().filter((user) => !this.channel()?.memberIds.includes(user.uid)),
  );
  readonly selectedMemberIds = signal(new Set<string>());
  readonly editing = signal(false);
  readonly errorMessage = signal('');
  readonly saving = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  startEditing(): void {
    const channel = this.channel();
    if (!channel) return;
    this.form.setValue({ name: channel.name, description: channel.description });
    this.errorMessage.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.errorMessage.set('');
  }

  toggleMember(uid: string): void {
    const selected = new Set(this.selectedMemberIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedMemberIds.set(selected);
  }

  isSelected(uid: string): boolean {
    return this.selectedMemberIds().has(uid);
  }

  async saveChannel(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.startSaving();
    await this.runSave();
  }

  async addMembers(): Promise<void> {
    const memberIds = [...this.selectedMemberIds()];
    if (!memberIds.length) return;
    await this.channels.addMembers(this.channelId(), memberIds);
    this.selectedMemberIds.set(new Set());
  }

  async leaveChannel(): Promise<void> {
    await this.channels.leaveChannel(this.channelId());
    await this.router.navigateByUrl('/workspace');
  }

  private async runSave(): Promise<void> {
    try {
      await this.channels.updateChannel(this.channelId(), this.form.getRawValue());
      this.editing.set(false);
    } catch (error) {
      this.errorMessage.set(this.channelError(error));
    } finally {
      this.saving.set(false);
    }
  }

  private channelError(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'Dieser Channelname ist bereits vergeben.';
    return 'Die Channeländerungen konnten nicht gespeichert werden.';
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib einen Channelnamen ein.');
  }

  private startSaving(): void {
    this.saving.set(true);
    this.errorMessage.set('');
  }

  currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }
}
