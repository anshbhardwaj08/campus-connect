// Loading placeholder skeleton block
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 ${className}`} />;
}
