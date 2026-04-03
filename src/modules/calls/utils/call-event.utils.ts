import { CallStatus } from '../../../generated/prisma/client';

type HangupStatusMappingContext = {
  isVapiLeg?: boolean;
};

type CallStatusProvider = 'telnyx' | 'vapi';
type CallStatusMappingInput = {
  provider: CallStatusProvider;
  eventType?: string;
  payload: any;
  context?: HangupStatusMappingContext;
};

const includesAny = (value: string, keywords: string[]): boolean => keywords.some((keyword) => value.includes(keyword));

const normalizeToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const TELNYX_CAUSE_MAP = new Map<string, CallStatus>([
  ['user_busy', CallStatus.busy],
  ['no_answer', CallStatus.no_answer],
  ['originator_cancel', CallStatus.no_answer],
  ['call_rejected', CallStatus.failed],
  ['timeout', CallStatus.no_answer],
  ['time_limit', CallStatus.no_answer],
  ['not_found', CallStatus.failed_telephony],
]);

const VAPI_STATUS_MAP = new Map<string, CallStatus>([
  ['queued', CallStatus.initiated],
  ['ringing', CallStatus.initiated],
  ['in-progress', CallStatus.in_progress],
]);

const VAPI_ENDED_REASON_MAP = new Map<string, CallStatus>([
  ['silence-timed-out', CallStatus.ai_silence_timeout],
  ['exceeded-max-duration', CallStatus.ai_silence_timeout],
  ['customer-busy', CallStatus.busy],
  ['customer-did-not-answer', CallStatus.no_answer],
  ['assistant-ended-call', CallStatus.ended_by_ai],
  ['assistant-ended-call-after-message-spoken', CallStatus.ended_by_ai],
  ['assistant-ended-call-with-hangup-task', CallStatus.ended_by_ai],
  ['assistant-said-end-call-phrase', CallStatus.ended_by_ai],
  ['assistant-forwarded-call', CallStatus.ended_by_ai],
  ['customer-ended-call', CallStatus.ended_by_user],
  ['customer-ended-call-before-warm-transfer', CallStatus.ended_by_user],
  ['customer-ended-call-after-warm-transfer-attempt', CallStatus.ended_by_user],
  ['customer-ended-call-during-transfer', CallStatus.ended_by_user],
]);

const mapTelnyxHangupStatus = (payload: any, context?: HangupStatusMappingContext): CallStatus => {
  const cause = normalizeToken(payload?.hangup_cause);
  return TELNYX_CAUSE_MAP.get(cause) ?? (context?.isVapiLeg ? CallStatus.ended_by_ai : CallStatus.ended_by_user);
};

const isVapiErrorReason = (reason: string): boolean => includesAny(reason, ['error', 'failed', 'pipeline-error', 'worker-died', 'worker-shutdown']);

const mapVapiStatus = (payload: any): CallStatus => {
  // const type = String(payload?.status ?? payload?.call?.status ?? '').toLowerCase();
  const endedReason = String(payload?.endedReason ?? payload?.ended_reason ?? payload?.call?.endedReason ?? '').toLowerCase();
  const statusFromMap = VAPI_ENDED_REASON_MAP.get(endedReason);
  if (statusFromMap) return statusFromMap;
  if (isVapiErrorReason(endedReason)) return CallStatus.failed_ai;

  return CallStatus.failed;
};

export const mapCallStatus = (input: CallStatusMappingInput): CallStatus => {
  if (input.provider === 'telnyx') return mapTelnyxHangupStatus(input.payload, input.context);
  if (input.provider === 'vapi') return mapVapiStatus(input.payload);

  return CallStatus.failed;
};

export const parseDurationSeconds = (payload: any): number | undefined => {
  const rawDuration = payload?.duration_seconds ?? payload?.call_duration ?? payload?.duration;
  if (rawDuration == null) {
    return undefined;
  }

  const parsed = Number(rawDuration);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return Math.round(parsed);
};

const parseIsoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

export const parseStartedAt = (payload: any, eventData?: any): string | undefined =>
  parseIsoDate(
    payload?.start_time ?? payload?.started_at ?? payload?.startTime ?? payload?.timestamp ?? eventData?.occurred_at ?? eventData?.occurredAt ?? eventData?.timestamp,
  );

export const parseEndedAt = (payload: any, eventData?: any): string | undefined =>
  parseIsoDate(
    payload?.endedAt ??
      payload?.ended_at ??
      payload?.end_time ??
      payload?.hangup_at ??
      payload?.endTime ??
      payload?.timestamp ??
      eventData?.occurred_at ??
      eventData?.occurredAt ??
      eventData?.timestamp,
  );
