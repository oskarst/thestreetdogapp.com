export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50/80 to-amber-50/40 px-4 dark:from-green-950/20 dark:to-background">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
