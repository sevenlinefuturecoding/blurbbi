import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Blurbi" },
      { name: "description", content: "Sign in to Blurbi to drop, spark, and orbit." },
      { property: "og:title", content: "Sign in · Blurbi" },
      { property: "og:description", content: "Sign in to Blurbi to drop, spark, and orbit." },
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
  const [busy, setBusy] = useState(false);

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
      toast.success("Welcome to Blurbi! Let's set up your profile.");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">blurbi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Say it in a Drop.</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-full">
            <TabsTrigger value="signin" className="rounded-full">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4 space-y-3">
            <EmailFields
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
            />
            <Button
              className="w-full rounded-full"
              disabled={busy || !email || !password}
              onClick={handleSignIn}
            >
              Sign in
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="mt-4 space-y-3">
            <EmailFields
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
            />
            <Button
              className="w-full rounded-full"
              disabled={busy || !email || !password}
              onClick={handleSignUp}
            >
              Create account
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
      </div>
    </div>
  );
}

function EmailFields({
  email,
  setEmail,
  password,
  setPassword,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="rounded-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="rounded-full"
        />
      </div>
    </>
  );
}
