// Feed of the last 10 admin-relevant actions (new listings, reports, deals)
export default function RecentActivity({ activity = [] }) {
  return <ul>{activity.length} recent actions</ul>;
}
