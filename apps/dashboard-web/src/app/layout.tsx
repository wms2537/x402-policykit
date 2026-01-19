import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "x402 PolicyKit Dashboard",
  description: "Monitor agent spending, enforce policies, and view payment receipts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] p-4 flex flex-col">
            <div className="mb-8">
              <h1 className="text-xl font-bold">x402 PolicyKit</h1>
              <p className="text-sm text-gray-500">Agent Spending Control</p>
            </div>
            <nav className="flex-1 space-y-1">
              <a href="/" className="block px-4 py-2 rounded-lg hover:bg-[var(--card-hover)] transition">
                Dashboard
              </a>
              <a href="/demo" className="block px-4 py-2 rounded-lg hover:bg-[var(--card-hover)] transition">
                Live Demo
              </a>
              <a href="/receipts" className="block px-4 py-2 rounded-lg hover:bg-[var(--card-hover)] transition">
                Receipts
              </a>
              <a href="/policy" className="block px-4 py-2 rounded-lg hover:bg-[var(--card-hover)] transition">
                Policy Editor
              </a>
            </nav>
            <div className="pt-4 border-t border-[var(--border)]">
              <a
                href="https://github.com/your-org/x402-policykit"
                target="_blank"
                rel="noopener"
                className="block px-4 py-2 text-sm text-gray-500 hover:text-white transition"
              >
                GitHub
              </a>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
