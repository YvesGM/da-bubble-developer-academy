import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Renders the legal imprint page and its operator contact information.
 *
 * The page uses the public legal layout rather than the authentication form
 * shell, keeping the imprint accessible without a signed-in session.
 */
@Component({
  selector: 'app-imprint',
  imports: [RouterLink],
  templateUrl: './imprint.html',
  styleUrl: '../legal-page.scss',
})
export class Imprint {}
