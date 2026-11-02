import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Displays the application's legal imprint. */
@Component({
  selector: 'app-imprint',
  imports: [RouterLink],
  templateUrl: './imprint.html',
  styleUrl: '../legal-page.scss',
})
export class Imprint {}
