// Top strip above the page content. Carries the page's own title (each page
// passes it via AdminWrapper's context — see PageHeader below) so the
// sidebar doesn't have to duplicate "where am I" as well as "where can I go".
export default function AdminNavbar({ title, blurb, actions }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b-[3px] border-ink bg-paper px-6 py-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-[26px] leading-none tracking-[.01em] text-ink">
          {title}
        </h1>
        {blurb && <p className="meta mt-1 truncate">{blurb}</p>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </header>
  );
}
