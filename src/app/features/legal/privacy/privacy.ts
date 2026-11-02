import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Displays the application's privacy notice. */
@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: '../legal-page.scss',
})
export class Privacy {}
