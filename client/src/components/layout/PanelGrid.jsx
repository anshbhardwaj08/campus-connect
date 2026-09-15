// The 12-column panel grid every content page (Home, Browse, listing
// detail…) lays its panels into. 4 columns on mobile, 8 on tablet, 12 on
// desktop, 9px gap throughout — the page background shows through the gap
// as the gutter. Children use Tailwind's own col-span-* utilities to size
// themselves (col-span-4 md:col-span-4 xl:col-span-3, etc).
export default function PanelGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-4 gap-[9px] md:grid-cols-8 xl:grid-cols-12 ${className}`}>
      {children}
    </div>
  );
}
