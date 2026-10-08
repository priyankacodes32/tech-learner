import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactRequest } from "@/lib/contact-requests.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Request Academy Access — Tech Learners" },
      {
        name: "description",
        content: "Contact Tech Learners to request student access or ask a question.",
      },
      { property: "og:title", content: "Request Academy Access — Tech Learners" },
      {
        property: "og:description",
        content: "Send your phone number or email to request access to Tech Learners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const sendRequest = useServerFn(submitContactRequest);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await sendRequest({ data: { phone, email, message } });
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Your message could not be sent. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto min-h-dvh max-w-5xl overflow-hidden bg-card sm:min-h-0 sm:rounded-lg sm:border sm:border-border sm:shadow-card-hover lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden bg-foreground px-5 pb-10 pt-6 text-background sm:px-10 sm:py-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-background/80 transition hover:text-background"
            >
              <ArrowLeft className="size-4" /> Back home
            </Link>
            <div className="mt-14 max-w-md sm:mt-24 lg:mt-32">
              <span className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
                <Sparkles className="size-5" />
              </span>
              <p className="mt-7 text-xs font-bold uppercase text-primary">Tech Learners</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                Start with a conversation.
              </h1>
              <p className="mt-5 text-sm leading-7 text-background/70 sm:text-base">
                Tell us how to reach you and what you want to learn. The academy team will contact
                you with the right access.
              </p>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-background/70">
            <MessageSquareText className="size-4 text-primary" /> Replies are handled directly by
            the academy team.
          </div>
        </section>

        <section className="px-5 py-9 sm:px-10 sm:py-12 lg:p-14">
          {sent ? (
            <div className="flex min-h-[28rem] flex-col justify-center">
              <CheckCircle2 className="size-12 text-success" />
              <h2 className="mt-6 font-display text-3xl font-bold">Message received.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                The academy team has your request and will reply using the contact details you
                provided.
              </p>
              <Button className="mt-8 w-full sm:w-fit" asChild>
                <Link to="/">
                  Return home <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-primary">Contact the academy</p>
              <h2 className="mt-2 font-display text-3xl font-bold">How can we help?</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Add either a phone number or email address. You can include both.
              </p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={30}
                      pattern="\+?[0-9][0-9 ()-]{6,24}"
                      title="Enter a valid phone number"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+1 555 012 3456"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      maxLength={255}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={6}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell us what you would like to learn or ask…"
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
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting || (!phone.trim() && !email.trim())}
                >
                  {submitting ? "Sending…" : "Send message"}
                  <ArrowRight />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
