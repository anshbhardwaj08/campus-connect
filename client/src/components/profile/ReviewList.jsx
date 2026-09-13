// List of reviews left for a user
export default function ReviewList({ reviews = [] }) {
  return <div>{reviews.length} reviews</div>;
}
