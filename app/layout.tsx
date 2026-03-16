// app/layout.tsx
import "../ui.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="z-root">{children}</body>
    </html>
  );
}
