import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Renders the public privacy notice and its structured processing disclosures.
 *
 * The route is available before authentication so visitors can review how
 * the application handles account and message data.
 */
@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: '../legal-page.scss',
})
export class Privacy {}
