import AccountShell from "./AccountShell";

export const metadata = { title: "My account", robots: { index: false, follow: false } };
export default function AccountLayout({ children }) { return <AccountShell>{children}</AccountShell>; }
