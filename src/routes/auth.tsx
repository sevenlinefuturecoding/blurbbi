import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, ArrowLeft, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Blurbbi" },
      { name: "description", content: "Sign in to Blurbbi to drop, spark, and orbit." },
      { property: "og:title", content: "Sign in · Blurbbi" },
      { property: "og:description", content: "Sign in to Blurbbi to drop, spark, and orbit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

async function destinationAfterAuth(): Promise<"/" | "/onboarding"> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/";
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();
  return profile?.onboarded ? "/" : "/onboarding";
}

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Modes: "auth" (default sign in / create account) | "forgot" (reset request) | "recovery" (setting new password)
  const [mode, setMode] = useState<"auth" | "forgot" | "recovery">("auth");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Check for password recovery auth event (when user clicks link in reset email)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
      }
    });

    // Also check URL hash for recovery type
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setMode("recovery");
    }

    return () => subscription.unsubscribe();
  }, []);

  async function go() {
    const to = await destinationAfterAuth();
    navigate({ to, replace: true });
  }

  async function handleSignUp() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        toast.info("Check your email to confirm your account.");
        return;
      }
      toast.success("Welcome to Blurbbi! Let's set up your profile.");
      navigate({ to: "/onboarding", replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await go();
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSendResetEmail() {
    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setBusy(true);
    try {
      const options =
        typeof window !== "undefined"
          ? { redirectTo: `${window.location.origin}/auth` }
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        targetEmail,
        options ? options : {},
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      setResetSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully! Welcome back.");
      setMode("auth");
      await go();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            blurbbi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Say it in a Drop.</p>
        </div>

        {/* MODE 1: FORGOT PASSWORD */}
        {mode === "forgot" ? (
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("auth");
                  setResetSent(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Back to sign in"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="font-display text-lg font-semibold text-foreground">Reset password</h2>
            </div>

            {resetSent ? (
              <div className="space-y-4 py-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground text-sm">Check your inbox</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We sent a password reset link to{" "}
                    <strong className="text-foreground">{resetEmail || email}</strong>. Click the
                    link in the email to choose a new password.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-full text-xs font-semibold"
                    onClick={() => {
                      setMode("auth");
                      setResetSent(false);
                    }}
                  >
                    Back to Sign in
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter the email associated with your account and we'll send you a link to reset
                  your password.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail || email}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoComplete="email"
                    className="rounded-full"
                    autoFocus
                  />
                </div>

                <Button
                  className="w-full rounded-full"
                  disabled={busy || !(resetEmail || email).trim()}
                  onClick={handleSendResetEmail}
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("auth")}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Remember your password? Sign in
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : mode === "recovery" ? (
          /* MODE 2: PASSWORD RECOVERY (SET NEW PASSWORD) */
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Set new password
              </h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose a secure password for your Blurbbi account (at least 6 characters).
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative flex items-center">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-full pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full rounded-full"
              disabled={busy || newPassword.length < 6}
              onClick={handleUpdatePassword}
            >
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                </span>
              ) : (
                "Update password & sign in"
              )}
            </Button>
          </div>
        ) : (
          /* MODE 3: DEFAULT SIGN IN / SIGN UP */
          <>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-full">
                <TabsTrigger value="signin" className="rounded-full">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">
                  Create account
                </TabsTrigger>
              </TabsList>

              {/* SIGN IN TAB */}
              <TabsContent value="signin" className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="rounded-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setMode("forgot");
                      }}
                      className="text-xs font-medium text-primary hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="rounded-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full rounded-full"
                  disabled={busy || !email || !password}
                  onClick={handleSignIn}
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </TabsContent>

              {/* CREATE ACCOUNT TAB */}
              <TabsContent value="signup" className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="rounded-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="rounded-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full rounded-full"
                  disabled={busy || !email || !password}
                  onClick={handleSignUp}
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                    </span>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="relative text-center text-xs text-muted-foreground">
              <span className="relative z-10 bg-background px-3">or continue with</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full rounded-full"
                disabled={busy}
                onClick={handleGoogle}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to keep it kind in the Stream.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
