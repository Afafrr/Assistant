import { CallStatus } from '../../../generated/prisma/client';

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

export const parseEndedAt = (payload: any): string | undefined => {
  const rawEndedAt = payload?.ended_at ?? payload?.end_time ?? payload?.hangup_at ?? payload?.timestamp;
  if (!rawEndedAt) {
    return undefined;
  }

  const parsed = new Date(rawEndedAt);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
};

export const resolveHangupStatus = (payload: any): CallStatus => {
  const cause = String(payload?.hangup_cause ?? payload?.hangup_reason ?? payload?.termination_reason ?? payload?.sip_hangup_cause ?? '').toLowerCase();

  if (cause.includes('busy')) {
    return CallStatus.busy;
  }

  if (cause.includes('no_answer') || cause.includes('no answer')) {
    return CallStatus.no_answer;
  }

  if (cause.includes('failed') || cause.includes('fail') || cause.includes('error') || cause.includes('reject')) {
    return CallStatus.failed;
  }

  return CallStatus.completed;
};
