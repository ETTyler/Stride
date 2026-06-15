import { signIn } from "@/auth";
import { ACCENT, CHALK, SERIF, SLATE } from "@/lib/theme";

export default function SignInPage() {
  return (
    <main
      style={{
        flex: 1,
        background: SLATE,
        color: CHALK,
        padding: "32px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-body), 'Barlow', system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, margin: "0 0 20px" }}>
          Stride<span style={{ color: ACCENT }}>.</span>
        </h1>
        <p style={{ fontSize: 16, margin: "0 0 32px", color: CHALK }}>
          Sign in to track your training
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px 0",
              background: ACCENT,
              color: SLATE,
              border: "none",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
