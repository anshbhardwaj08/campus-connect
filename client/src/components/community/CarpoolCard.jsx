// Card preview of a carpool ride offer
export default function CarpoolCard({ ride }) {
  return <div>{ride?.from} → {ride?.to}</div>;
}
