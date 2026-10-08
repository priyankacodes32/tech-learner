import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clock3,
  LockKeyhole,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import courseReact from "@/assets/course-react.jpg";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isValidPhone, phoneToLoginEmail } from "@/lib/phone-auth";

const demoAdminEmail = "admin@courseplatform.com";
const demoAdminPhone = "+15550000000";

type LandingSearch = { login?: boolean; redirect?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LandingSearch => {
    const parsed: LandingSearch = {};
    if (search["login"] === true || search["login"] === "true") parsed.login = true;
    if (typeof search["redirect"] === "string") parsed.redirect = search["redirect"];
    return parsed;
  },
  head: () => ({
    meta: [
      { title: "Tech Learners — Focused Online Learning" },
      {
        name: "description",
        content: "A focused learning space with instructor-led video programs and clear progress.",
      },
      { property: "og:title", content: "Tech Learners — Focused Online Learning" },
      {
        property: "og:description",
        content: "Join a guided learning experience built for real progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

async function getPrimaryRole(userId: string): Promise<"admin" | "assigner" | "student"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = new Set((data ?? []).map((r) => r.role));
  if (roles.has("admin")) return "admin";
  if (roles.has("assigner")) return "assigner";
  return "student";
}

function LandingPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(Boolean(search.login));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (search.login) setLoginOpen(true);
  }, [search.login]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user && !search.login) void routeUser(data.user.id);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per login-param change; routeUser only closes over stable navigate
  }, [search.login]);

  async function routeUser(userId: string, returnTo?: string) {
    const role = await getPrimaryRole(userId);
    // Send people back to the page they were heading to; route guards still enforce roles there.
    if (returnTo && /^\/(?!\/)/.test(returnTo) && !returnTo.startsWith("/?")) {
      await navigate({ href: returnTo, replace: true });
      return;
    }
    if (role === "admin") {
      await navigate({ to: "/admin/dashboard", replace: true });
    } else if (role === "assigner") {
      await navigate({ to: "/assigner/requests", replace: true });
    } else {
      await navigate({ to: "/dashboard", replace: true });
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const trimmedIdentifier = identifier.trim().toLowerCase();
    const isEmail = /^\S+@\S+\.\S+$/.test(trimmedIdentifier);
    const isPhone = isValidPhone(trimmedIdentifier);
    if (!isEmail && !isPhone) {
      setError("Enter a valid email address or phone number with its country code.");
      setSubmitting(false);
      return;
    }
    const email = isPhone
      ? trimmedIdentifier === demoAdminPhone
        ? demoAdminEmail
        : phoneToLoginEmail(trimmedIdentifier)
      : trimmedIdentifier;
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !data.user) {
      setError(
        "The email, phone number, or password is incorrect. Please contact the academy if you need access.",
      );
      setSubmitting(false);
      return;
    }
    await routeUser(data.user.id, search.redirect);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-4 sm:flex sm:h-18 sm:px-8 lg:px-10">
          <a
            href="#top"
            className="flex min-w-0 items-center gap-3 font-display font-bold"
            aria-label="Tech Learners home"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
              <Sparkles className="size-4.5" />
            </span>
            <span className="truncate">Tech Learners</span>
          </a>
          <nav className="ml-auto hidden items-center gap-7 md:flex" aria-label="Main navigation">
            <a
              href="#why-aster"
              className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Why Tech Learners
            </a>
            <Button variant="ghost" onClick={() => setLoginOpen(true)}>
              Student sign in
            </Button>
            <Button asChild>
              <Link to="/contact">
                Enter the academy <ArrowRight />
              </Link>
            </Button>
          </nav>
          <Button
            className="md:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {mobileOpen && (
          <nav
            className="border-t border-border bg-card px-4 py-4 shadow-card md:hidden"
            aria-label="Mobile navigation"
          >
            <a
              onClick={() => setMobileOpen(false)}
              href="#why-aster"
              className="block py-3 text-sm font-semibold"
            >
              Why Tech Learners
            </a>
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                setMobileOpen(false);
                setLoginOpen(true);
              }}
            >
              Student sign in
            </Button>
            <Button className="mt-2 w-full" asChild>
              <Link to="/contact" onClick={() => setMobileOpen(false)}>
                Enter the academy <ArrowRight />
              </Link>
            </Button>
          </nav>
        )}
      </header>

      <main id="top">
        <section className="relative flex min-h-[86dvh] items-end overflow-hidden pt-24 sm:min-h-[90vh]">
          <img
            src={courseReact}
            alt="Focused online learning at Tech Learners"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-hero-wash" />
          <div className="relative mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 sm:pb-20 lg:px-10">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/85 px-3 py-1.5 text-xs font-bold uppercase text-primary backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary" /> Practical learning. Focused
                progress.
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.08] sm:text-6xl lg:text-7xl">
                Learn skills that move you forward.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg">
                A guided video-learning experience designed around clear milestones, flexible
                access, and meaningful progress.
              </p>
              <div className="mt-8 grid gap-3 sm:flex">
                <Button size="lg" asChild>
                  <Link to="/contact">
                    Enter the academy <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)}>
                  <LockKeyhole /> Student sign in
                </Button>
              </div>
              <div className="mt-9 grid gap-3 text-sm font-semibold sm:flex sm:flex-wrap sm:gap-x-8">
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-success" /> Learn at your pace
                </span>
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-success" /> Track every milestone
                </span>
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-success" /> Private student access
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="why-aster" className="border-y border-border bg-card py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <p className="text-sm font-bold uppercase text-primary">Built for momentum</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl">
              A learning space that stays out of your way.
            </h2>
            <div className="mt-10 grid border-l border-t border-border sm:grid-cols-3">
              {[
                {
                  icon: Play,
                  title: "Learn without friction",
                  copy: "Resume exactly where you left off, on any screen.",
                },
                {
                  icon: Clock3,
                  title: "See your progress",
                  copy: "Keep completion and remaining access time clear.",
                },
                {
                  icon: ShieldCheck,
                  title: "Personal access",
                  copy: "Your academy access is arranged directly by the team.",
                },
              ].map(({ icon: Icon, title, copy }) => (
                <article key={title} className="border-b border-r border-border p-6 sm:p-8">
                  <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-7 font-display text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-foreground py-14 text-background sm:py-18">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-10">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Ready when you are</p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl">
                Tell us what you want to learn.
              </h2>
              <p className="mt-3 text-sm text-background/70">
                Our team will help arrange your student access.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to="/contact">
                Enter the academy <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-card py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span className="font-display font-bold text-foreground">Tech Learners</span>
          <span>Focused learning for ambitious people.</span>
        </div>
      </footer>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="inset-x-0 bottom-0 top-auto max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl border-border bg-card p-6 shadow-card-hover data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:p-8">
          <DialogHeader className="text-left">
            <span className="mb-3 grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
              <Sparkles className="size-5" />
            </span>
            <DialogTitle className="font-display text-2xl font-bold">Academy sign in</DialogTitle>
            <DialogDescription>
              Students use their phone number. Staff sign in with their email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-identifier">Email or phone number</Label>
              <Input
                id="login-identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                required
                maxLength={254}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@example.com or +1 555 012 3456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error && (
              <p
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
              <ArrowRight />
            </Button>
          </form>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mr-1 inline size-3" /> Need access?{" "}
            <Link
              to="/contact"
              className="font-semibold text-primary hover:underline"
              onClick={() => setLoginOpen(false)}
            >
              Contact the academy.
            </Link>
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
