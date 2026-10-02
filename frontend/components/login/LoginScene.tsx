"use client";

import Image from "next/image";
import { Instrument_Serif } from "next/font/google";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { InviteFlowError, inviteLookupError, inviteRedeemError } from "@/lib/api/invite-errors";
import styles from "./login-scene.module.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export type SocietyMatch = {
  name: string;
  city: string;
  homes?: number;
  members?: number;
};

export type JoinFlowConfig = {
  email: string;
  initialCode?: string;
  onRedeem: (code: string) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export type LoginSceneProps = {
  /** Resolve on success (parent redirects). Throw an Error with a user-facing message on failure. */
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  /** Start the Google OAuth redirect. Throw to show an error. */
  onGoogleSignIn: () => Promise<void>;
  /** Send a reset email. Throw to show an error. */
  onForgotPassword: (email: string) => Promise<void>;
  /** Look up an invite code. Return null when the code is unknown. */
  onLookupInvite: (code: string) => Promise<SocietyMatch | null>;
  /** User confirmed the society; parent stores the code so it can join after sign-in. */
  onInviteConfirmed?: (code: string, society: SocietyMatch) => void;
  /** Signed-in redeem flow (/join): same invite panel, completes membership instead of sign-in. */
  joinFlow?: JoinFlowConfig;
};

type View = "main" | "email" | "invite" | "sent";
type IntroStage = "" | "start" | "fade" | "logo" | "reveal";

const INTRO_KEY = "lp-login-intro-played";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function LoginScene({
  onEmailSignIn,
  onGoogleSignIn,
  onForgotPassword,
  onLookupInvite,
  onInviteConfirmed,
  joinFlow,
}: LoginSceneProps) {
  // Start hidden so returning visitors get a soft fade-in instead of a flash.
  const [intro, setIntro] = useState<IntroStage>("start");
  const timers = useRef<number[]>([]);

  const [view, setView] = useState<View>(joinFlow ? "invite" : "main");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [pwErr, setPwErr] = useState("");

  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [inviteError, setInviteError] = useState<{ title: string; message: string } | null>(null);
  const [society, setSociety] = useState<SocietyMatch | null>(null);
  const [joining, setJoining] = useState<SocietyMatch | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    if (!joinFlow?.initialCode) return;
    const normalized = joinFlow.initialCode.trim().toUpperCase().replace(/\s/g, "");
    setCode(normalized);
    if (normalized.length < 4) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const match = await onLookupInvite(normalized);
        if (!cancelled && match) setSociety(match);
      } catch {
        /* user can tap Find my society again */
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [joinFlow?.initialCode, onLookupInvite]);

  // Intro: once per browser session, skipped for reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let played = false;
    try {
      played = window.sessionStorage.getItem(INTRO_KEY) === "1";
      window.sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* storage blocked: just play it */
    }
    if (reduce || played) {
      setIntro("");
      return;
    }
    const at = (ms: number, stage: IntroStage) =>
      timers.current.push(window.setTimeout(() => setIntro(stage), ms));
    at(60, "fade");
    at(1000, "logo");
    at(2500, "reveal");
    at(3600, "");
    return clearTimers;
  }, []);

  // Any tap or key during the intro jumps to the reveal.
  const skipIntro = useCallback(() => {
    if (!intro || intro === "reveal") return;
    clearTimers();
    setIntro("reveal");
    timers.current.push(window.setTimeout(() => setIntro(""), 700));
  }, [intro]);

  const go = (next: View) => {
    setFormError("");
    setView(next);
  };

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailErr("Enter an email like name@example.com.");
      ok = false;
    }
    if (password.length < 6) {
      setPwErr("Enter your password (at least 6 characters).");
      ok = false;
    }
    if (!ok) return;
    setBusy(true);
    setFormError("");
    try {
      await onEmailSignIn(email.trim(), password);
    } catch (err) {
      setFormError(errorMessage(err, "We couldn't sign you in. Check your email and password."));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setFormError("");
    try {
      await onGoogleSignIn();
    } catch (err) {
      setFormError(errorMessage(err, "Google sign-in didn't start. Try again."));
      setBusy(false);
    }
  }

  async function forgot() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailErr("Enter your email first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await onForgotPassword(email.trim());
      go("sent");
    } catch (err) {
      setFormError(errorMessage(err, "We couldn't send the reset email. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function submitInvite(e: FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/\s/g, "");
    if (joinFlow && society) {
      setBusy(true);
      setFormError("");
      try {
        await joinFlow.onRedeem(normalized);
      } catch (err) {
        const flow = err instanceof InviteFlowError ? err : inviteRedeemError(err);
        setInviteError({ title: flow.title, message: flow.message });
        setFormError("");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (society) {
      onInviteConfirmed?.(normalized, society);
      setJoining(society);
      go("email");
      return;
    }
    if (normalized.length < 4) {
      setCodeErr("Enter the code from your committee, e.g. SECTOR50.");
      return;
    }
    setBusy(true);
    setFormError("");
    setInviteError(null);
    try {
      const match = await onLookupInvite(normalized);
      if (match) {
        setSociety(match);
        setInviteError(null);
      }
    } catch (err) {
      const flow = err instanceof InviteFlowError ? err : inviteLookupError(err);
      setInviteError({ title: flow.title, message: flow.message });
      setSociety(null);
      setCodeErr("");
    } finally {
      setBusy(false);
    }
  }

  const backIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );

  return (
    <div
      className={`${styles.scene} ${display.variable}`}
      data-intro={intro}
      onPointerDown={skipIntro}
      onKeyDown={skipIntro}
    >
      {/* Desktop: empty-sky painting + cloud layers on one stage, so they zoom together */}
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.kb}>
          <Image src="/images/login/login-scene-clear.webp" alt="" fill priority sizes="max(100vw, 180vh)" className={styles.bgImage} />
          <Image src="/images/login/clouds/cloud-1.png" alt="" width={233} height={129} className={`${styles.cloud} ${styles.c1}`} />
          <Image src="/images/login/clouds/cloud-2.png" alt="" width={145} height={93} className={`${styles.cloud} ${styles.c2}`} />
          <Image src="/images/login/clouds/cloud-3.png" alt="" width={165} height={103} className={`${styles.cloud} ${styles.c3}`} />
          <Image src="/images/login/clouds/cloud-4.png" alt="" width={164} height={97} className={`${styles.cloud} ${styles.c4}`} />
        </div>
      </div>

      {/* Phones: vertical crop with clouds baked in */}
      <div className={styles.mobileBg} aria-hidden="true">
        <div className={styles.mobileBgInner}>
          <Image src="/images/login/login-poster-mobile.webp" alt="" fill sizes="100vw" className={styles.bgImage} />
        </div>
      </div>

      <div className={styles.shade} />
      <div className={styles.grain} />

      <div className={styles.content}>
        <header className={styles.hero}>
          <Image className={styles.mark} src="/brand/living-plus-mark-white.svg" alt="Living+" width={44} height={44} priority />
          <h1 className={styles.headline}>
            Your neighbours, <em>finally</em> your people.
          </h1>
          <p className={styles.subhead}>The private app for life in your society.</p>
        </header>

        <section className={styles.panel} data-view={view} aria-live="polite">
          {view === "main" && (
            <div className={styles.view} key="main">
              <h2 className={styles.title}>Welcome home</h2>
              <p className={styles.lead}>Sign in to your community.</p>
              <div className={styles.stack}>
                {formError && <p className={styles.formError} role="alert">{formError}</p>}
                <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => go("email")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                  Continue with email
                </button>
                <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={google} disabled={busy}>
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                  </svg>
                  Continue with Google
                </button>
              </div>
              <p className={styles.invite}>
                Have an invite code?{" "}
                <button type="button" className={styles.link} onClick={() => go("invite")}>
                  Join your society
                </button>
              </p>
              <p className={styles.foot}>Private to your society · We never show ads</p>
            </div>
          )}

          {view === "email" && (
            <form className={styles.view} key="email" onSubmit={submitEmail} noValidate>
              <button type="button" className={styles.back} onClick={() => go("main")}>
                {backIcon}Back
              </button>
              <h2 className={styles.title}>Sign in with email</h2>
              <div className={styles.stack}>
                {joining && (
                  <p className={styles.notice}>
                    Sign in to request to join <b>{joining.name}</b>.
                  </p>
                )}
                {formError && <p className={styles.formError} role="alert">{formError}</p>}
                <div className={styles.field}>
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    autoFocus
                    aria-invalid={emailErr ? true : undefined}
                    aria-describedby="login-email-err"
                    onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
                  />
                  <span id="login-email-err" className={styles.err}>{emailErr}</span>
                </div>
                <div className={styles.field}>
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    aria-invalid={pwErr ? true : undefined}
                    aria-describedby="login-password-err"
                    onChange={(e) => { setPassword(e.target.value); setPwErr(""); }}
                  />
                  <span id="login-password-err" className={styles.err}>{pwErr}</span>
                </div>
                <div className={styles.rowEnd}>
                  <button type="button" className={styles.link} onClick={forgot} disabled={busy}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </form>
          )}

          {view === "invite" && (
            <form className={styles.view} key="invite" onSubmit={submitInvite} noValidate>
              {joinFlow ? (
                <button
                  type="button"
                  className={styles.back}
                  disabled={busy}
                  onClick={() => void joinFlow.onSignOut()}
                >
                  {backIcon}Sign out
                </button>
              ) : (
                <button type="button" className={styles.back} onClick={() => go("main")}>
                  {backIcon}Back
                </button>
              )}
              <h2 className={styles.title}>Find your home</h2>
              <p className={styles.lead}>
                {joinFlow
                  ? "Enter your one-time code to join your society."
                  : "Enter the code your committee shared."}
              </p>
              <div className={styles.stack}>
                {joinFlow && (
                  <p className={styles.notice}>
                    Signed in as <b>{joinFlow.email || "your Google account"}</b>. Guest demo codes work
                    with any account; personal codes must match your email.
                  </p>
                )}
                {inviteError ? (
                  <div className={styles.codeAlert} role="alert">
                    <strong>{inviteError.title}</strong>
                    <span>{inviteError.message}</span>
                  </div>
                ) : null}
                <div className={styles.field}>
                  <label htmlFor="login-invite">Invite code</label>
                  <input
                    id="login-invite"
                    className={styles.upper}
                    autoComplete="off"
                    placeholder="e.g. PMG-9R2N"
                    value={code}
                    autoFocus
                    disabled={busy}
                    aria-invalid={codeErr || inviteError ? true : undefined}
                    aria-describedby="login-invite-err"
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                      setCodeErr("");
                      setInviteError(null);
                      setSociety(null);
                    }}
                  />
                  {codeErr ? (
                    <span id="login-invite-err" className={styles.err}>
                      {codeErr}
                    </span>
                  ) : null}
                </div>
                {society && (
                  <div className={styles.result}>
                    <Image src="/brand/living-plus-icon.svg" alt="" width={40} height={40} />
                    <div>
                      <b>{society.name}</b>
                      <span>
                        {[society.city, society.homes && `${society.homes} homes`, society.members && `${society.members} neighbours here`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </div>
                )}
                <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={busy}>
                  {joinFlow && society
                    ? busy
                      ? "Joining…"
                      : "Join society"
                    : society
                      ? "That's my home"
                      : busy
                        ? "Checking…"
                        : "Find my society"}
                </button>
              </div>
              {joinFlow ? (
                <p className={styles.foot}>Codes are one-person, one-use · Private to your society</p>
              ) : null}
            </form>
          )}

          {view === "sent" && (
            <div className={styles.view} key="sent">
              <div className={styles.doneIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E8EF5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </div>
              <h2 className={styles.title}>Check your inbox</h2>
              <p className={styles.lead}>We sent a reset link to {email.trim()}.</p>
              <div className={styles.stack}>
                <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => go("email")}>
                  Back to sign in
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className={styles.whiteout} />
      <div className={styles.lockup} aria-hidden="true">
        <Image className={styles.lockupIcon} src="/brand/living-plus-icon.svg" alt="" width={72} height={72} priority />
        <span className={styles.lockupWord}>Living+</span>
      </div>
    </div>
  );
}
