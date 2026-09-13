// KPI stat card: total users, listings, deals, or reports
export default function KPICard({ label, value }) {
  return (
    <div>
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  );
}
