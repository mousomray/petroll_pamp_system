"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
// PrimeReact styles (kept local to this page)
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (!email) return "Please enter your email.";
    if (!password) return "Please enter your password.";
    return "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      setLoading(true);
      // TODO: replace with real API call
      await new Promise((r) => setTimeout(r, 900));
      // fake success - redirect to admin dashboard / login landing
      router.push("/admin");
    } catch (e) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "radial-gradient(1200px 600px at 10% 10%, rgba(2,48,64,0.16), transparent 60%), radial-gradient(900px 500px at 90% 30%, rgba(11,85,102,0.12), transparent 55%), linear-gradient(180deg,#f4f8fb,#eef6fb)",
      }}
    >
      <section style={{ width: "100%", maxWidth: 980 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <Card
            style={{
              borderRadius: 14,
              overflow: "hidden",
              background: "linear-gradient(180deg,#023040,#063c48)",
              color: "#fff",
            }}
          >
            <div style={{ padding: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Image src="/img/icons/icon-48x48.png" alt="logo" width={56} height={56} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 26, letterSpacing: 0.2 }}>PetrolPump OPS</h2>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                      }}
                    >
                      Secure Login
                    </span>
                  </div>
                  <div style={{ opacity: 0.9 }}>Accounting for Fuel Retailers</div>
                </div>
              </div>

              <p style={{ marginTop: 18, color: "rgba(255,255,255,0.95)", lineHeight: 1.65 }}>
                Welcome back. Sign in to manage daily pump operations with speed and accuracy.
              </p>

              <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
                {[
                  { icon: "pi pi-bolt", text: "Fast billing & shift workflow" },
                  { icon: "pi pi-receipt", text: "Invoices & cashbook" },
                  { icon: "pi pi-box", text: "Stock and inventory tracking" },
                ].map((it) => (
                  <div
                    key={it.text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <i className={it.icon} aria-hidden="true" />
                    <span style={{ color: "rgba(255,255,255,0.95)" }}>{it.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card style={{ borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#072033" }}>Sign in</h3>
                  <p style={{ marginTop: 6, marginBottom: 0, color: "#6b7280" }}>
                    Use your admin credentials to continue.
                  </p>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(2,48,64,0.06)" }}>
                  <i className="pi pi-user" aria-hidden="true" style={{ color: "#023040", fontSize: 18 }} />
                </div>
              </div>

              {error && (
                <div style={{ marginTop: 14 }}>
                  <Message severity="error" text={error} />
                </div>
              )}

              <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <div>
                  <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#334155" }}>
                    Email
                  </label>
                  <InputText
                    id="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="Please enter email address"
                    autoComplete="email"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label htmlFor="password" style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#334155" }}>
                    Password
                  </label>
                  <Password
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    feedback={false}
                    toggleMask
                    placeholder="Enter password"
                    inputStyle={{ width: "100%" }}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox inputId="remember" checked={remember} onChange={(e) => setRemember(!!e.checked)} />
                    <label htmlFor="remember" style={{ color: "#475569" }}>
                      Remember me
                    </label>
                  </div>
                  <a href="#" style={{ color: "#0b5566", textDecoration: "none", fontWeight: 600 }}>
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  label={loading ? "Signing in..." : "Sign in"}
                  icon="pi pi-sign-in"
                  loading={loading}
                  className="p-button-primary"
                  style={{ width: "100%", fontWeight: 700, padding: "10px 14px" }}
                />
              </form>

              <div style={{ marginTop: 14, textAlign: "center" }}>
                <small style={{ color: "#94a3b8" }}>
                  Don’t have an account? <a href="/admin/register">Contact admin</a>
                </small>
              </div>

              <div style={{ marginTop: 10, textAlign: "center" }}>
                <Button
                  type="button"
                  label="Back to Welcome"
                  icon="pi pi-arrow-left"
                  className="p-button-text"
                  onClick={() => router.push("/")}
                />
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
