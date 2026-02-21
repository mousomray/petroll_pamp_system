"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

export default function Home() {
  const router = useRouter();

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#f6fbff,#eef6fb)" }}>
      <section style={{ width: "100%", maxWidth: 1000, padding: 28 }}>
        <div className="card" style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(16,24,40,0.08)" }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: 0 }}>
            <div style={{ flex: 1, padding: 60, background: "linear-gradient(180deg,#052231,#083042)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <Image src="/img/icons/icon-48x48.png" alt="logo" width={52} height={52} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 34, color: "#fff" }}>PetrolPump OPS</h1>
                  <div style={{ opacity: 0.9, marginTop: 6 }}>Accounting for Fuel Retailers</div>
                </div>
              </div>

              <p style={{ color: "rgba(255,255,255,0.95)", fontSize: 17, lineHeight: 1.6, maxWidth: 540 }}>
                Welcome to PetrolPump OPS — a focused, secure accounting solution for petrol pump businesses. Log in to manage sales, invoices, and stock in one place.
              </p>

              <div style={{ marginTop: 28 }}>
                <button
                  onClick={() => router.push('/admin')}
                  className="btn btn-lg btn-primary"
                  style={{ padding: "12px 22px", fontWeight: 700 }}
                >
                  Login to your account
                </button>
              </div>
            </div>

            <div style={{ flex: 0.65, padding: 36, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <Image src="/img/avatars/avatar-1.jpg" alt="Welcome" width={220} height={220} style={{ borderRadius: 16, objectFit: 'cover' }} />
                <h3 style={{ marginTop: 18, color: '#072033' }}>Ready when you are</h3>
                <p style={{ color: '#6b7280' }}>Fast, lightweight, and built for daily pump operations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
