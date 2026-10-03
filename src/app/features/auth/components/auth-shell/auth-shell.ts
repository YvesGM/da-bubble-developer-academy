import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  @Input() showSignup = false;
}
