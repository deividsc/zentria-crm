/**
 * Capture Module
 * Auto-capture events: page_view, scroll_depth, cta_click,
 * form_start, form_submit, form_abandon.
 */

import { generateUUID } from './identity';
import type { QueuedEvent } from './buffer';

type EventCallback = (event: QueuedEvent) => void;

interface CaptureOptions {
  captureClicks?: boolean;
  captureForms?: boolean;
  captureScroll?: boolean;
  scrollThresholds?: number[];
}

const DEFAULT_SCROLL_THRESHOLDS = [25, 50, 75, 90];

let isInitialized = false;
let callback: EventCallback | null = null;
let options: CaptureOptions = {};
let reportedScrollDepths = new Set<number>();
let formStartTimes = new Map<HTMLFormElement, number>();
let formInteracted = new Map<HTMLFormElement, boolean>();

/**
 * Build a QueuedEvent from capture parameters.
 */
function buildEvent(
  eventType: string,
  eventData: Record<string, unknown>,
  anonymousId: string,
  knownId: string | null,
  sessionId: string
): QueuedEvent {
  return {
    eventId: generateUUID(),
    eventType,
    eventData,
    timestamp: new Date().toISOString(),
    pageUrl: typeof location !== 'undefined' ? location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
    anonymousId,
    knownId,
    sessionId,
  };
}

/**
 * Emit a captured event through the registered callback.
 */
function emit(
  eventType: string,
  eventData: Record<string, unknown>,
  anonymousId: string,
  knownId: string | null,
  sessionId: string
): void {
  if (!callback) return;
  callback(buildEvent(eventType, eventData, anonymousId, knownId, sessionId));
}

/**
 * Capture page_view event.
 */
export function capturePageView(
  anonymousId: string,
  knownId: string | null,
  sessionId: string
): void {
  emit(
    'page_view',
    {
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      utm_source: getUtmParam('utm_source'),
      utm_medium: getUtmParam('utm_medium'),
      utm_campaign: getUtmParam('utm_campaign'),
    },
    anonymousId,
    knownId,
    sessionId
  );
}

function getUtmParam(key: string): string | null {
  if (typeof location === 'undefined') return null;
  const params = new URLSearchParams(location.search);
  return params.get(key);
}

/**
 * Track scroll depth thresholds.
 */
function handleScroll(anonymousId: string, knownId: string | null, sessionId: string): void {
  if (typeof document === 'undefined') return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (docHeight <= 0) return;

  const percent = Math.round((scrollTop / docHeight) * 100);
  const thresholds = options.scrollThresholds ?? DEFAULT_SCROLL_THRESHOLDS;

  for (const threshold of thresholds) {
    if (percent >= threshold && !reportedScrollDepths.has(threshold)) {
      reportedScrollDepths.add(threshold);
      emit(
        'scroll_depth',
        { depth: threshold, maxDepth: percent },
        anonymousId,
        knownId,
        sessionId
      );
    }
  }
}

/**
 * Build a CSS selector string from an element: tag#id.firstClass
 */
function buildSelector(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const firstClass = el.classList.length > 0 ? `.${el.classList[0]}` : '';
  return `${tag}${id}${firstClass}`;
}

/**
 * Track CTA / button clicks.
 */
function handleClick(
  event: MouseEvent,
  anonymousId: string,
  knownId: string | null,
  sessionId: string
): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const clickable = target.closest('a, button, [role="button"]') as HTMLElement | null;
  if (!clickable) return;

  const selector = buildSelector(clickable);
  const cta_text = (clickable.textContent?.trim() || clickable.getAttribute('aria-label') || '').slice(0, 100);
  const x = event.clientX;
  const y = event.clientY;

  emit(
    'cta_click',
    { selector, cta_text, x, y },
    anonymousId,
    knownId,
    sessionId
  );
}

/**
 * Track form interactions: start, submit, abandon.
 */
function handleFormStart(
  event: Event,
  anonymousId: string,
  knownId: string | null,
  sessionId: string
): void {
  const form = event.target as HTMLFormElement;
  if (!form || formInteracted.get(form)) return;

  formInteracted.set(form, true);
  formStartTimes.set(form, Date.now());

  emit(
    'form_start',
    { formId: form.id || undefined, formAction: form.action || undefined },
    anonymousId,
    knownId,
    sessionId
  );
}

function handleFormSubmit(
  event: SubmitEvent,
  anonymousId: string,
  knownId: string | null,
  sessionId: string
): void {
  const form = event.target as HTMLFormElement;
  const startTime = formStartTimes.get(form);
  const durationMs = startTime ? Date.now() - startTime : undefined;

  emit(
    'form_submit',
    {
      formId: form.id || undefined,
      formAction: form.action || undefined,
      durationMs,
    },
    anonymousId,
    knownId,
    sessionId
  );

  formStartTimes.delete(form);
  formInteracted.delete(form);
}

/**
 * Detect form abandonment on page unload.
 */
function handleBeforeUnload(anonymousId: string, knownId: string | null, sessionId: string): void {
  formInteracted.forEach((_, form) => {
    const startTime = formStartTimes.get(form);
    const durationMs = startTime ? Date.now() - startTime : undefined;

    emit(
      'form_abandon',
      {
        formId: form.id || undefined,
        formAction: form.action || undefined,
        durationMs,
      },
      anonymousId,
      knownId,
      sessionId
    );
  });
}

// Store listener references for cleanup
let scrollListener: ((this: Window, ev: Event) => void) | null = null;
let clickListener: ((this: Document, ev: MouseEvent) => void) | null = null;
let formFocusListener: ((this: Document, ev: Event) => void) | null = null;
let formSubmitListener: ((this: Document, ev: SubmitEvent) => void) | null = null;
let unloadListener: ((this: Window, ev: BeforeUnloadEvent) => void) | null = null;

/**
 * Initialize auto-capture listeners.
 */
export function initCapture(
  eventCallback: EventCallback,
  anonymousId: string,
  knownId: string | null,
  sessionId: string,
  opts: CaptureOptions = {}
): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  callback = eventCallback;
  options = opts;
  reportedScrollDepths = new Set<number>();
  formStartTimes = new Map<HTMLFormElement, number>();
  formInteracted = new Map<HTMLFormElement, boolean>();

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Scroll depth
  if (opts.captureScroll !== false) {
    scrollListener = (): void => handleScroll(anonymousId, knownId, sessionId);
    window.addEventListener('scroll', scrollListener, { passive: true });
  }

  // CTA clicks
  if (opts.captureClicks !== false) {
    clickListener = (e: MouseEvent): void => handleClick(e, anonymousId, knownId, sessionId);
    document.addEventListener('click', clickListener);
  }

  // Form tracking
  if (opts.captureForms !== false) {
    formFocusListener = (e: Event): void => handleFormStart(e, anonymousId, knownId, sessionId);
    document.addEventListener('focusin', formFocusListener);

    formSubmitListener = (e: SubmitEvent): void => handleFormSubmit(e, anonymousId, knownId, sessionId);
    document.addEventListener('submit', formSubmitListener);

    unloadListener = (): void => handleBeforeUnload(anonymousId, knownId, sessionId);
    window.addEventListener('beforeunload', unloadListener);
  }

  // Emit initial page_view
  capturePageView(anonymousId, knownId, sessionId);

  // Return cleanup function
  return (): void => {
    if (scrollListener) window.removeEventListener('scroll', scrollListener);
    if (clickListener) document.removeEventListener('click', clickListener);
    if (formFocusListener) document.removeEventListener('focusin', formFocusListener);
    if (formSubmitListener) document.removeEventListener('submit', formSubmitListener);
    if (unloadListener) window.removeEventListener('beforeunload', unloadListener);
    isInitialized = false;
    callback = null;
  };
}
