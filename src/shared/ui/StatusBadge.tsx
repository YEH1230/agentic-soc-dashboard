import { AlertTriangle, Bot, CheckCircle2, CircleHelp, Database, UserRound } from "lucide-react";
import type { Classification, DetectionStatus, Severity } from "../model/types";
import { classificationLabel, severityLabel, statusLabel } from "../lib/format";

export function StatusBadge({ status }: { status: DetectionStatus }) {
  const Icon = status === "completed" ? CheckCircle2 : status === "no_data" ? Database : AlertTriangle;
  return (
    <span className={`badge badge--status-${status}`}>
      <Icon size={13} />
      {statusLabel[status]}
    </span>
  );
}

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const Icon =
    classification === "malicious_bot" || classification === "benign_bot"
      ? Bot
      : classification === "human"
        ? UserRound
        : CircleHelp;
  return (
    <span className={`badge badge--classification-${classification}`}>
      <Icon size={13} />
      {classificationLabel[classification]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`severity severity--${severity}`}>{severityLabel[severity]}</span>;
}
