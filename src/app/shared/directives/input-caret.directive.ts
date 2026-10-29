import { DOCUMENT } from '@angular/common';
import { AfterViewInit, DestroyRef, Directive, ElementRef, Renderer2, inject } from '@angular/core';

/** Draws the compact Figma caret without changing native editing or selection. */
@Directive({
  selector: 'input[appInputCaret]',
  standalone: true,
  host: {
    '(focus)': 'show()',
    '(blur)': 'hide()',
    '(input)': 'queueUpdate()',
    '(keyup)': 'queueUpdate()',
    '(click)': 'queueUpdate()',
    '(pointerup)': 'queueUpdate()',
    '(change)': 'queueUpdate()',
    '(scroll)': 'queueUpdate()',
    '(select)': 'queueUpdate()',
    '(compositionstart)': 'hide()',
    '(compositionend)': 'show()',
  },
})
export class InputCaretDirective implements AfterViewInit {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly view = this.document.defaultView;
  private readonly destroyRef = inject(DestroyRef);

  private caret: HTMLElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private passwordMirror: HTMLSpanElement | null = null;
  private frame = 0;
  private active = false;
  private originalColor = '';
  private readonly onScroll = () => this.queueUpdate();

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** Covers inputs that are already focused when the directive initializes. */
  ngAfterViewInit(): void {
    if (this.document.activeElement === this.input) this.show();
  }

  /** Keeps native caret for email/number inputs, unsupported browsers and IME. */
  show(): void {
    if (!this.canMeasure() || !this.view) return;
    this.ensureCaret();
    if (!this.active) {
      this.originalColor = this.input.style.caretColor;
      this.document.addEventListener('scroll', this.onScroll, true);
      this.view.addEventListener('resize', this.onScroll);
    }
    this.active = true;
    this.input.style.caretColor = 'transparent';
    this.queueUpdate();
  }

  /** Restores the original input caret on blur or composition. */
  hide(): void {
    if (this.active) {
      this.input.style.caretColor = this.originalColor;
      this.document.removeEventListener('scroll', this.onScroll, true);
      this.view?.removeEventListener('resize', this.onScroll);
    }
    this.active = false;
    if (this.caret) this.caret.hidden = true;
  }

  /** Avoids layout reads for every keydown and selection event. */
  queueUpdate(): void {
    if (!this.active || this.frame || !this.view) return;
    this.frame = this.view.requestAnimationFrame(() => {
      this.frame = 0;
      this.updatePosition();
    });
  }

  /** Only text/search/tel/url/password provide a usable selectionStart API. */
  private canMeasure(): boolean {
    return ['text', 'search', 'tel', 'url', 'password'].includes(this.input.type)
      && this.input.selectionStart !== null;
  }

  /** Creates a single noninteractive indicator for the lifetime of the directive. */
  private ensureCaret(): void {
    if (this.caret) return;
    this.caret = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(this.caret, 'app-input-caret');
    this.renderer.setAttribute(this.caret, 'aria-hidden', 'true');
    this.renderer.appendChild(this.document.body, this.caret);
  }

  /** Measures characters before the insertion point using their rendered geometry. */
  private updatePosition(): void {
    if (!this.caret || !this.view || !this.active) return;
    const position = this.input.selectionStart;
    if (position === null || position !== this.input.selectionEnd) return this.hideIndicator();
    const style = this.view.getComputedStyle(this.input);
    const context = this.measurementContext();
    if (!context) return this.hide();
    context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const spacing = parseFloat(style.letterSpacing) || 0;
    const width = this.input.type === 'password'
      ? this.passwordAdvance(position, style)
      : this.textAdvance(context, position, spacing);
    this.positionIndicator(style, width);
  }

  /** Measures masked glyphs in a width-independent element, never the password value. */
  private passwordAdvance(count: number, style: CSSStyleDeclaration): number {
    if (!count) return 0;
    const mirror = this.ensurePasswordMirror();
    mirror.style.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.textContent = '•'.repeat(count);
    return mirror.getBoundingClientRect().width;
  }

  /** Uses the browser's mask glyph in Chromium and matching bullet text elsewhere. */
  private ensurePasswordMirror(): HTMLSpanElement {
    if (this.passwordMirror) return this.passwordMirror;
    const mirror = this.document.createElement('span');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.cssText = 'position:fixed;left:-10000px;top:-10000px;display:inline-block;width:max-content;white-space:pre;padding:0;border:0;margin:0;visibility:hidden;pointer-events:none';
    mirror.style.setProperty('-webkit-text-security', 'disc');
    this.renderer.appendChild(this.document.body, mirror);
    return (this.passwordMirror = mirror);
  }

  /** Measures editable text with its current font and character spacing. */
  private textAdvance(context: CanvasRenderingContext2D, count: number, spacing: number): number {
    const prefix = this.input.value.slice(0, count);
    return context.measureText(prefix).width + Math.max(0, prefix.length - 1) * spacing;
  }

  /** Positions the indicator within the visible, horizontally scrolling input. */
  private positionIndicator(style: CSSStyleDeclaration, advance: number): void {
    if (!this.caret || !this.view) return;
    const rect = this.input.getBoundingClientRect();
    const left = rect.left + (parseFloat(style.paddingLeft) || 0);
    const right = rect.right - (parseFloat(style.paddingRight) || 0);
    const x = left + advance - this.input.scrollLeft;
    if (x < left - 2 || x > right + 2) return this.hideIndicator();
    this.caret.style.left = `${Math.max(left, Math.min(right, x))}px`;
    this.caret.style.top = `${rect.top + (rect.height - 18) / 2}px`;
    this.caret.hidden = rect.bottom < 0 || rect.top > this.view.innerHeight;
  }

  /** Hides the visual caret while the user selects a text range. */
  private hideIndicator(): void {
    if (this.caret) this.caret.hidden = true;
  }

  /** Reuses one canvas rather than creating a measurement element per keystroke. */
  private measurementContext(): CanvasRenderingContext2D | null {
    this.context ??= this.document.createElement('canvas').getContext('2d');
    return this.context;
  }

  /** Cleans up the global indicator and subscriptions with the input component. */
  private dispose(): void {
    this.hide();
    if (this.frame) this.view?.cancelAnimationFrame(this.frame);
    if (this.caret) this.renderer.removeChild(this.document.body, this.caret);
    if (this.passwordMirror) this.renderer.removeChild(this.document.body, this.passwordMirror);
  }
}
