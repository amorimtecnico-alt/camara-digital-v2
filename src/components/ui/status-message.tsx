type StatusMessageProps = {
  error?: string | undefined;
  success?: string | undefined;
};

export function StatusMessage({ error, success }: StatusMessageProps) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      className={
        error
          ? "rounded-2xl border border-[#efcccc] bg-[#fff3f3] px-4 py-3 text-sm text-danger"
          : "rounded-2xl border border-[#c8dcc7] bg-[#f2fbf1] px-4 py-3 text-sm text-primary"
      }
    >
      {error ?? success}
    </div>
  );
}
