import { DOCUMENT } from '@angular/common';
import { AfterViewInit, DestroyRef, Directive, ElementRef, Renderer2, inject } from '@angular/core';

/** Draws the compact Figma caret without changing native editing or selection. */
@Directive({
  selector: 'input[appInputCaret], textarea[appInputCaret]',
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
  private readonly input = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly view = this.document.defaultView;
  private readonly destroyRef = inject(DestroyRef);

  private caret: HTMLElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private passwordMirror: HTMLInputElement | null = null;
  private textMirror: HTMLDivElement | null = null;
  private frame = 0;
  private active = false;
  private originalColor = '';
  private originalPriority = '';
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
      this.originalPriority = this.input.style.getPropertyPriority('caret-color');
      this.document.addEventListener('scroll', this.onScroll, true);
      this.view.addEventListener('resize', this.onScroll);
    }
    this.active = true;
    this.input.style.setProperty('caret-color', 'transparent', 'important');
    this.queueUpdate();
  }

  /** Restores the original input caret on blur or composition. */
  hide(): void {
    if (this.active) {
      if (this.originalColor) {
        this.input.style.setProperty('caret-color', this.originalColor, this.originalPriority);
      } else {
        this.input.style.removeProperty('caret-color');
      }
      this.document.removeEventListener('scroll', this.onScroll, true);
      this.view?.removeEventListener('resize', this.onScroll);
    }
    this.active = false;
    if (this.caret) this.caret.hidden = true;
  }

  /** Avoids layout reads for every keydown and selection event. */
  queueUpdate(): void {
    if (!this.active || !this.view) return;
    this.input.style.setProperty('caret-color', 'transparent', 'important');
    if (this.frame) return;
    this.frame = this.view.requestAnimationFrame(() => {
      this.frame = 0;
      this.updatePosition();
    });
  }

  /** Supported inputs and textareas expose a stable selectionStart API. */
  private canMeasure(): boolean {
    return (this.input.tagName === 'TEXTAREA'
      || ['text', 'search', 'tel', 'url', 'password'].includes(this.input.type))
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
    if (this.input.tagName === 'TEXTAREA') return this.positionTextareaCaret(style, position);
    const context = this.measurementContext();
    if (!context) return this.hide();
    context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const spacing = parseFloat(style.letterSpacing) || 0;
    const width = this.input.type === 'password'
      ? this.passwordAdvance(position, style, context)
      : this.textAdvance(context, position, spacing);
    this.positionIndicator(style, width);
  }

  /** Measures a textarea caret using the same font, wrapping and padding as the native field. */
  private positionTextareaCaret(style: CSSStyleDeclaration, position: number): void {
    const mirror = this.ensureTextMirror();
    const field = this.input as HTMLTextAreaElement;
    mirror.style.width = `${field.clientWidth}px`;
    mirror.style.font = style.font;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.padding = style.padding;
    mirror.style.textIndent = style.textIndent;
    mirror.style.tabSize = style.tabSize;
    mirror.style.wordBreak = style.wordBreak;
    mirror.style.overflowWrap = style.overflowWrap;
    const marker = this.document.createElement('span');
    marker.textContent = '\u200b';
    mirror.replaceChildren(this.document.createTextNode(field.value.slice(0, position)), marker);
    const bounds = field.getBoundingClientRect();
    const mirrorBounds = mirror.getBoundingClientRect();
    const markerBounds = marker.getBoundingClientRect();
    const x = bounds.left + markerBounds.left - mirrorBounds.left - field.scrollLeft;
    const y = bounds.top + markerBounds.top - mirrorBounds.top - field.scrollTop;
    const height = Math.min(parseFloat(style.lineHeight) || 18, 25);
    if (!this.caret) return;
    this.caret.style.left = `${x}px`;
    this.caret.style.top = `${y}px`;
    this.caret.style.height = `${height}px`;
    this.caret.hidden = x < bounds.left || x > bounds.right || y < bounds.top
      || y + height > bounds.bottom || y < 0 || y > (this.view?.innerHeight ?? 0);
  }

  /** Creates a single offscreen multiline mirror for the current directive instance. */
  private ensureTextMirror(): HTMLDivElement {
    if (this.textMirror) return this.textMirror;
    const mirror = this.document.createElement('div');
    mirror.style.cssText = 'position:fixed;top:0;left:-10000px;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:break-word;visibility:hidden;pointer-events:none';
    this.renderer.appendChild(this.document.body, mirror);
    return (this.textMirror = mirror);
  }

  /** Measures password masks using the browser's actual native input renderer. */
  private passwordAdvance(
    count: number, style: CSSStyleDeclaration, context: CanvasRenderingContext2D,
  ): number {
    if (!count) return 0;
    const mirror = this.ensurePasswordMirror();
    mirror.style.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.value = 'x'.repeat(count);
    // A one-pixel input reports the native masked content width via scrollWidth.
    const nativeWidth = mirror.scrollWidth - mirror.clientWidth + 1;
    return nativeWidth > 1 ? nativeWidth : context.measureText('•'.repeat(count)).width;
  }

  /** The mirror never receives real password characters or keyboard focus. */
  private ensurePasswordMirror(): HTMLInputElement {
    if (this.passwordMirror) return this.passwordMirror;
    const mirror = this.document.createElement('input');
    mirror.type = 'password';
    mirror.readOnly = true;
    mirror.tabIndex = -1;
    mirror.autocomplete = 'off';
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;padding:0;border:0;margin:0;box-sizing:content-box;visibility:hidden;pointer-events:none';
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
    const ratio = this.view.devicePixelRatio || 1;
    const snap = (value: number): number => Math.round(value * ratio) / ratio;
    this.caret.style.width = `${Math.max(2, 2 / ratio)}px`;
    this.caret.style.left = `${snap(Math.max(left, Math.min(right, x)))}px`;
    this.caret.style.top = `${snap(rect.top + (rect.height - 18) / 2)}px`;
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
    if (this.textMirror) this.renderer.removeChild(this.document.body, this.textMirror);
  }
}
