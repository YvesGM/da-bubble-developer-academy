import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { ChannelNameTakenError } from '../../../core/errors/channel-name-taken.error';
import { ConversationTarget } from '../../../core/models/conversation.model';
import { ChannelService } from '../../../core/services/channel.service';
import { UserService } from '../../../core/services/user.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { ChatPanel } from '../components/chat-panel/chat-panel';

@Component({
  selector: 'app-channel-view',
  imports: [ReactiveFormsModule, ChatPanel],
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
  readonly members = computed(() => this.users().filter((user) => this.isChannelMember(user.uid)));
  readonly availableUsers = computed(() => this.users().filter((user) => !this.isChannelMember(user.uid)));
  readonly selectedMemberIds = signal(new Set<string>());
  readonly target = computed<ConversationTarget>(() => ({
    type: 'channel',
    id: this.channelId(),
  }));
  readonly addGuestAccess = signal(false);
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

  toggleGuestAccess(): void {
    this.addGuestAccess.update((value) => !value);
  }

  isSelected(uid: string): boolean {
    return this.selectedMemberIds().has(uid);
  }

  isGuestCurrentUser(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  canManageChannel(): boolean {
    return !this.isGuestCurrentUser();
  }

  canLeaveChannel(): boolean {
    return !this.isGuestCurrentUser();
  }

  async saveChannel(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.startSaving();
    await this.runSave();
  }

  async addMembers(): Promise<void> {
    const memberIds = [...this.selectedMemberIds()];
    await this.channels.addMembers(this.channelId(), memberIds, this.addGuestAccess());
    this.selectedMemberIds.set(new Set());
    this.addGuestAccess.set(false);
  }

  async leaveChannel(): Promise<void> {
    if (!this.canLeaveChannel()) return;
    await this.channels.leaveChannel(this.channelId());
    await this.router.navigateByUrl('/workspace');
  }

  currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  private isChannelMember(uid: string): boolean {
    return this.channel()?.memberIds.includes(uid) ?? false;
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
    if (error instanceof ChannelNameTakenError) return 'This channel name is already in use.';
    return firebaseErrorMessage(error, 'The channel changes could not be saved.');
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please enter a channel name.');
  }

  private startSaving(): void {
    this.saving.set(true);
    this.errorMessage.set('');
  }
}
