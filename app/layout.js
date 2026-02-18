export const metadata = {
  title: "Zilkara",
  description: "Crypto scanner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "ui-serif, Georgia, Cambria, Times New Roman, Times, serif" }}>
        {children}
      </body>
    </html>
  );
}
