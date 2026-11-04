import { Component } from '@angular/core';

/**
 * Renders the public privacy notice and its structured processing disclosures.
 *
 * The route is available before authentication so visitors can review how
 * the application handles account and message data.
 */
@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.html',
  styleUrl: '../legal-page.scss',
})
export class Privacy {}
