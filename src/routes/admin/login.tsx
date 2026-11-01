import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdminRole, recordAdminLogin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminLoginSearch {
  redirect?: string | undefined;
  error?: string | undefined;
}

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>): AdminLoginSearch => {
    return {
      redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
      error: typeof search["error"] === "string" ? search["error"] : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Administrator Sign In · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginScreen,
});

function AdminLoginScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // MFA TOTP State
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  const [unauthorizedBanner, setUnauthorizedBanner] = useState(search.error === "unauthorized");

  // If already logged in as admin, redirect directly
  useEffect(() => {
    let isMounted = true;
    async function checkExisting() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const role = await getCurrentAdminRole();
      if (!role) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.is_admin) return;
      }

      if (isMounted) {
        navigate({ to: search.redirect || "/admin" });
      }
    }
    checkExisting();
    return () => {
      isMounted = false;
    };
  }, [navigate, search.redirect]);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    setUnauthorizedBanner(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      // Check MFA requirement
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = factorsData?.totp?.find((f) => f.status === "verified");

      if (verifiedTotp) {
        // Create MFA challenge
        const challengeRes = await supabase.auth.mfa.challenge({
          factorId: verifiedTotp.id,
        });

        if (challengeRes.error) {
          throw challengeRes.error;
        }

        setMfaChallengeId(challengeRes.data.id);
        setMfaFactorId(verifiedTotp.id);
        setLoading(false);
        return;
      }

      // Verify Database Admin Role
      await finalizeAdminSession();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to authenticate administrator");
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode || !mfaChallengeId || !mfaFactorId) {
      toast.error("Please enter the 6-digit authenticator code");
      return;
    }

    setVerifyingMfa(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: totpCode.trim(),
      });

      if (error) throw error;

      await finalizeAdminSession();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid MFA security code");
      setVerifyingMfa(false);
    }
  }

  async function finalizeAdminSession() {
    const role = await getCurrentAdminRole();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let authorized = Boolean(role);
    if (!authorized && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_admin) {
        authorized = true;
      }
    }

    if (!authorized) {
      // User is authenticated in Supabase but lacks administrative permissions
      await supabase.auth.signOut();
      setUnauthorizedBanner(true);
      setLoading(false);
      setVerifyingMfa(false);
      return;
    }

    // Record login activity
    await recordAdminLogin({
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      auth_method: mfaChallengeId ? "password+mfa" : "password",
      timestamp: new Date().toISOString(),
    });

    toast.success("Welcome back to Blurbbi Control Center");
    navigate({ to: search.redirect || "/admin" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 selection:bg-primary/20">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border text-primary shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Blurbbi Control Center</h1>
          <p className="text-xs text-muted-foreground">
            Restricted access for authorized platform administrators only.
          </p>
        </div>

        {/* Unauthorized Banner */}
        {unauthorizedBanner && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-3 text-xs text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Administrative Access Denied</div>
              <div className="text-muted-foreground mt-0.5">
                The authenticated account does not have administrative privileges in Blurbbi. Please
                contact a Super Admin to request an invitation.
              </div>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          {!mfaChallengeId ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs">
                  Administrator Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@blurbbi.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs h-9 bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-xs">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 text-xs h-9 bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs h-9 font-medium gap-1.5"
              >
                {loading ? "Verifying Credentials..." : "Sign In to Admin"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center space-y-1">
                <KeyRound className="h-8 w-8 mx-auto text-primary" />
                <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit security code from your authenticator app.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mfa-code" className="text-xs">
                  Authenticator Code
                </Label>
                <Input
                  id="mfa-code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  autoFocus
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center font-mono text-base tracking-widest h-10 bg-background"
                />
              </div>

              <Button
                type="submit"
                disabled={verifyingMfa || totpCode.length < 6}
                className="w-full text-xs h-9 font-medium"
              >
                {verifyingMfa ? "Verifying Code..." : "Authenticate"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMfaChallengeId(null);
                  setTotpCode("");
                }}
                className="w-full text-xs text-muted-foreground"
              >
                Cancel MFA
              </Button>
            </form>
          )}

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />
              Return to Public Stream
            </Link>
            <span className="font-mono text-[10px]">Blurbbi v1.0 Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
