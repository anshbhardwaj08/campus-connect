// Single chat message bubble (text/image/offer)
export default function MessageBubble({ message }) {
  return <div>{message?.text}</div>;
}
