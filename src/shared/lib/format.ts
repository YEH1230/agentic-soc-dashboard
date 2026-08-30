import type {
  Classification,
  DetectionStatus,
  Severity,
  TimezoneMode,
} from "../model/types";

export const severityOrder: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const severityLabel: Record<Severity, string> = {
  critical: "치명적",
  high: "높음",
  medium: "중간",
  low: "낮음",
  info: "정보",
};

export const classificationLabel: Record<Classification, string> = {
  malicious_bot: "악성 봇",
  benign_bot: "정상 봇",
  human: "사람",
  undetermined: "판단 보류",
};

export const statusLabel: Record<DetectionStatus, string> = {
  completed: "정상 완료",
  no_data: "데이터 없음",
  partial: "부분 실패",
};

export function formatDateTime(value: string, timezone: TimezoneMode, withSeconds = false) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: timezone === "KST" ? "Asia/Seoul" : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(new Date(value));
}

export function formatWindow(start: string, end: string, timezone: TimezoneMode) {
  const startText = formatDateTime(start, timezone, true);
  const endTime = new Intl.DateTimeFormat("ko-KR", {
    timeZone: timezone === "KST" ? "Asia/Seoul" : "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(end));
  return `${startText} – ${endTime}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function isEnrichmentEmpty(enrichment: {
  country: string | null;
  asn: string | null;
  as_org: string | null;
}) {
  return !enrichment.country && !enrichment.asn && !enrichment.as_org;
}
