// Queue of listings awaiting moderator approval
export default function PendingQueue({ listings = [] }) {
  return <div>{listings.length} pending listings</div>;
}
