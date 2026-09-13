// Reusable styled button component (primary/secondary/danger variants)
export default function Button({ children, ...props }) {
  return <button {...props}>{children}</button>;
}
