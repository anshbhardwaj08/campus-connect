// Profile header: avatar, name, trust score, dept/batch info
export default function ProfileHeader({ user }) {
  return <div>{user?.name}</div>;
}
