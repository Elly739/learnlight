import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>404 - Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Go back home</Link>
    </main>
  );
}
