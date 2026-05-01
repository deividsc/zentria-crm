import { z } from 'zod';

export const PageViewEventDataSchema = z.object({
  referrer: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
});

export const ScrollDepthEventDataSchema = z.object({
  depth: z.number().int().min(0).max(100),
  maxDepth: z.number().int().min(0).max(100),
});

export const CtaClickEventDataSchema = z.object({
  selector: z.string(),
  cta_text: z.string(),
  x: z.number(),
  y: z.number(),
});

export const IdentityLinkedEventDataSchema = z.object({
  known_id: z.string().max(255),
  linked_at: z.string().datetime(),
});

export const FormStartEventDataSchema = z.object({
  formId: z.string().optional().nullable(),
  formAction: z.string().optional().nullable(),
});

export const FormSubmitEventDataSchema = z.object({
  formId: z.string().optional().nullable(),
  formAction: z.string().optional().nullable(),
  durationMs: z.number().int().optional().nullable(),
});

export const FormAbandonEventDataSchema = z.object({
  formId: z.string().optional().nullable(),
  formAction: z.string().optional().nullable(),
  durationMs: z.number().int().optional().nullable(),
});

export const EventSchema = z.discriminatedUnion('eventType', [
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('page_view'),
    eventData: PageViewEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('scroll_depth'),
    eventData: ScrollDepthEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('cta_click'),
    eventData: CtaClickEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('form_start'),
    eventData: FormStartEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('form_submit'),
    eventData: FormSubmitEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('form_abandon'),
    eventData: FormAbandonEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
  z.object({
    eventId: z.string().uuid(),
    eventType: z.literal('identity_linked'),
    eventData: IdentityLinkedEventDataSchema,
    timestamp: z.string().datetime(),
    pageUrl: z.string().max(2048),
    pageTitle: z.string().max(500),
    anonymousId: z.string().uuid(),
    knownId: z.string().max(255).nullable(),
    sessionId: z.string().uuid(),
  }),
]);

export const BatchPayloadSchema = z.object({
  apiKey: z.string().min(1),
  events: z.array(EventSchema).min(1).max(100),
});

export type BatchPayload = z.infer<typeof BatchPayloadSchema>;
export type TrackedEvent = z.infer<typeof EventSchema>;
