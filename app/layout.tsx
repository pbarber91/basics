import "./globals.css";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import ClientThemeProvider from "@/components/client-theme-provider";
import { ModeToggle } from "@/components/ModeToggle";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "USER";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ClientThemeProvider>
          <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur dark:bg-background/70">
            <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
              <Link href="/" className="font-semibold tracking-tight">
                Mission Community Church — <span className="text-brand-700">Courses</span>
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/program" className="hover:underline">Program</Link>
                <ModeToggle />
                {!session ? (
                  <Link href="/signin">
                    <Button size="sm">Sign in</Button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
                      Role: {role}
                    </span>
                    <SignOutButton />
                  </div>
                )}
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl p-4">{children}</main>

          <footer className="mt-16 border-t py-6 text-center text-xs text-slate-500 dark:border-slate-800">
            © {new Date().getFullYear()} Mission Community Church
          </footer>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
