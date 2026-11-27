export interface ScaffoldNoticeProps {
  apiBaseUrl?: string;
}

export function ScaffoldNotice({ apiBaseUrl }: ScaffoldNoticeProps) {
  return (
    <section
      aria-labelledby="scaffold-heading"
      className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <p className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        Foundation Scaffold
      </p>
      <h1 id="scaffold-heading" className="mt-4 text-2xl font-semibold text-slate-900">
        CollabSpace
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Project scaffold is online. Design tokens, shared UI primitives, API services, and
        authentication routes build on this baseline.
      </p>
      {apiBaseUrl ? (
        <dl className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <dt className="font-medium text-slate-700">Configured API base URL</dt>
          <dd className="mt-1 font-mono text-xs break-all text-slate-900">{apiBaseUrl}</dd>
        </dl>
      ) : null}
    </section>
  );
}
