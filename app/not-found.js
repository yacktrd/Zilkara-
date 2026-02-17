// app/not-found.js

export default function NotFound() {
  return (
    <main style={styles.main}>
      <div style={styles.box}>
        <div style={styles.title}>404</div>

        <div style={styles.subtitle}>
          Zilkara — page introuvable
        </div>

        <a href="/" style={styles.link}>
          Retour au scanner
        </a>
      </div>
    </main>
  );
}

const styles = {
  main: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      'ui-serif, "New York", "Iowan Old Style", "Palatino Linotype", Palatino, serif',
  },

  box: {
    textAlign: "center",
  },

  title: {
    fontSize: 72,
    fontWeight: 700,
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 18,
    opacity: 0.7,
    marginBottom: 24,
  },

  link: {
    fontSize: 16,
    textDecoration: "underline",
  },
};
