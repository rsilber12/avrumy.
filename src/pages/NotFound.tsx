import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="text-center flex-1 flex flex-col items-center justify-center">
        <h1 className="mb-4 text-4xl font-light">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-foreground hover:text-muted-foreground transition-colors">
          Return to Home
        </a>
      </div>

      {/* Footer */}
      <footer className="text-center text-muted-foreground text-sm py-12">
        © {new Date().getFullYear()} Avrumy, LLC
      </footer>
    </div>
  );
};

export default NotFound;
