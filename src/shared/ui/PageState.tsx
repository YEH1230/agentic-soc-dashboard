import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "데이터를 불러오는 중입니다" }: { label?: string }) {
  return (
    <div className="page-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="page-state page-state--error" role="alert">
      <AlertTriangle size={24} />
      <strong>데이터를 표시할 수 없습니다</strong>
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({ title, message }: { title?: string; message: string }) {
  return (
    <div className="page-state">
      <Inbox size={24} />
      {title ? <strong>{title}</strong> : null}
      <p>{message}</p>
    </div>
  );
}
