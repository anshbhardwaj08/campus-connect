// List of chat conversations in the inbox
export default function ConversationList({ conversations = [] }) {
  return <ul>{conversations.length} conversations</ul>;
}
