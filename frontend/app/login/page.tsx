"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema } from "@/helper/schema/Schema"
import axiosInstance from '@/service/axios.service'
import { useAppDispatch } from "@/lib/store/hooks"
import { tokenSlice } from "../../lib/store/features/storeToken"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const dispatch = useAppDispatch();

  type LoginForm = z.infer<typeof LoginSchema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setLoading(true);

    try {
      const res = await axiosInstance.post('/api/login', data);
      const token = res.data.token;
      console.log("My token...", token);

      dispatch(tokenSlice.actions.saveToken(token));
      localStorage.setItem("login-token", res.data.token);
      console.log("Response...", res)
      router.push("/dashboard");
    } catch (error: any) {
      console.log("Login error:", error);
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      setError(errorMessage);
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
        padding: "20px 14px",
        background:
          "radial-gradient(900px 480px at 8% 12%, rgba(16,80,102,0.15), transparent 60%), radial-gradient(800px 420px at 88% 88%, rgba(3,87,74,0.12), transparent 60%), linear-gradient(160deg,#f3f7fb 0%, #edf4fb 42%, #e9f3f2 100%)",
      }}
    >
      <section style={{ width: "100%", maxWidth: 1080 }}>
        <div
          className="grid grid-cols-1 xl:grid-cols-2"
          style={{
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <Card
            style={{
              borderRadius: 16,
              overflow: "hidden",
              background: "linear-gradient(168deg,#032738 0%,#063e4b 62%,#0b5664 100%)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 16px 38px rgba(3,39,56,0.28)",
            }}
          >
            <div style={{ padding: 22, height: "100%", display: "grid", alignContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
                    border: "1px solid rgba(255,255,255,0.24)",
                    boxShadow: "0 8px 18px rgba(0,0,0,0.24)",
                  }}
                >
                  <Image
                    src="/img/icons/icon-48x48.png"
                    alt="logo"
                    width={50}
                    height={50}
                    style={{
                      filter: "contrast(1.2) saturate(1.2)",
                      mixBlendMode: "screen",
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: "clamp(24px,2.2vw,30px)", letterSpacing: 0.1, fontWeight: 700, color: "#ffffff" }}>PetrolPump OPS</h2>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 11px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.14)",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      Secure Login
                    </span>
                  </div>
                  <div style={{ opacity: 0.92, fontSize: "clamp(16px,1.6vw,22px)", fontWeight: 600 }}>Accounting for Fuel Retailers</div>
                </div>
              </div>

              <p style={{ marginTop: 4, color: "rgba(255,255,255,0.96)", lineHeight: 1.65, fontSize: "clamp(15px,1.2vw,21px)" }}>
                Welcome back. Sign in to manage daily pump operations with speed and accuracy.
              </p>

              <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
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
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <i className={it.icon} aria-hidden="true" />
                    <span style={{ color: "rgba(255,255,255,0.98)", fontSize: 16 }}>{it.text}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 4,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Status</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>System Online</div>
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Security</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>Role Based Access</div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #dde7f0",
              boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
              background: "linear-gradient(180deg,#ffffff,#f9fbfe)",
            }}
          >
            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#072033", fontSize: 28 }}>Sign in</h3>
                  <p style={{ marginTop: 6, marginBottom: 0, color: "#64748b", fontSize: 15 }}>
                    Use your admin credentials to continue.
                  </p>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(2,48,64,0.07)",
                    border: "1px solid rgba(2,48,64,0.12)",
                  }}
                >
                  <i className="pi pi-user" aria-hidden="true" style={{ color: "#023040", fontSize: 19 }} />
                </div>
              </div>

              {error && (
                <div style={{ marginTop: 14 }}>
                  <Message severity="error" text={error} />
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 18, display: "grid", gap: 14 }}>
                <div>
                  <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#334155" }}>
                    Email
                  </label>
                  <InputText
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Please enter email address"
                    autoComplete="email"
                    style={{ width: "100%" }}
                    className={errors.email ? "p-invalid" : ""}
                  />
                  {errors.email && (
                    <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                      {errors.email.message}
                    </small>
                  )}
                </div>

                <div>
                  <label htmlFor="password" style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#334155" }}>
                    Password
                  </label>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <div style={{ position: "relative", width: "100%" }}>
                        <InputText
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="Enter password"
                          autoComplete="current-password"
                          style={{ width: "100%", paddingRight: 42 }}
                          className={errors.password ? "p-invalid" : ""}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "transparent",
                            color: "#64748b",
                            cursor: "pointer",
                            padding: 0,
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <i className={`pi ${showPassword ? "pi-eye-slash" : "pi-eye"}`} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  />
                  {errors.password && (
                    <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                      {errors.password.message}
                    </small>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox inputId="remember" checked={remember} onChange={(e) => setRemember(!!e.checked)} />
                    <label htmlFor="remember" style={{ color: "#475569" }}>
                      Remember me
                    </label>
                  </div>
                  <a href="/forget-password" style={{ color: "#0b5566", textDecoration: "none", fontWeight: 600 }}>
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  label={loading ? "Signing in..." : "Sign in"}
                  icon="pi pi-sign-in"
                  loading={loading}
                  className="p-button-primary"
                  style={{ width: "100%", fontWeight: 700, padding: "11px 14px" }}
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
