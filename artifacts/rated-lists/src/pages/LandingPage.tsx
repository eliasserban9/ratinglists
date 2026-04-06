import { useLocation } from "wouter";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold mb-3 tracking-tight">Rating Lists</h1>
      <p className="text-muted-foreground mb-10 text-base max-w-xs">
        Create lists, rate your items, and keep everything synced across devices.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          className="w-full py-2.5 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          onClick={() => navigate("/sign-in")}
        >
          Sign In
        </button>
        <button
          className="w-full py-2.5 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
          onClick={() => navigate("/sign-up")}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
