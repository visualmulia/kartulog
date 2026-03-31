"use client";
import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  // Kalau sudah login, otomatis lempar ke dashboard
  useEffect(() => {
    if (!loading && profile) router.push("/dashboard");
  }, [profile, loading, router]);

  async function handleGoogleLogin() {
    setIsLoggingIn(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login gagal:", err);
      setError("Gagal masuk. Coba lagi.");
      setIsLoggingIn(false);
    }
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#060B19" }} />;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .login-wrap {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background-color: #060B19; font-family: 'Inter', sans-serif;
          position: relative; overflow: hidden; padding: 24px;
        }
        
        .login-wrap::before {
          content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,240,255,0.1) 0%, rgba(6,11,25,0) 60%);
          z-index: 0; pointer-events: none;
        }

        .back-link {
          position: absolute; top: 32px; left: 32px;
          color: #94A3B8; text-decoration: none; font-size: 14px; font-weight: 500;
          z-index: 10; transition: color 0.2s;
        }
        .back-link:hover { color: #fff; }

        .login-card {
          width: 100%; max-width: 420px; background: rgba(11, 19, 43, 0.7);
          backdrop-filter: blur(20px); border: 1px solid #1C2A4A;
          border-radius: 24px; padding: 48px 40px; text-align: center;
          z-index: 1; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .login-logo { display: inline-flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 32px; text-decoration: none; }
        .logo-mark {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, #8A2BE2, #00F0FF);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 20px; color: #fff;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
        }
        .logo-text { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }

        .login-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .login-desc { font-size: 14px; color: #94A3B8; margin-bottom: 32px; line-height: 1.5; }

        .google-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
          background: #fff; color: #060B19; border: none; border-radius: 12px;
          padding: 14px 20px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .google-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255,255,255,0.2); }
        .google-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
        .error-msg {
          margin-top: 16px; padding: 12px; border-radius: 8px;
          background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
          color: #EF4444; font-size: 13px; font-weight: 500;
        }

        .legal-text { margin-top: 32px; font-size: 12px; color: #64748B; line-height: 1.6; }
        .legal-text a { color: #00F0FF; text-decoration: none; transition: color 0.2s; }
        .legal-text a:hover { color: #fff; text-decoration: underline; }
      `}</style>

      <div className="login-wrap">
        <Link href="/" className="back-link">← Kembali</Link>

        <div className="login-card">
          <Link href="/" className="login-logo">
            <div className="logo-mark">K</div>
            <span className="logo-text">KartuLog</span>
          </Link>
          
          <h1 className="login-title">Akses Brankasmu</h1>
          <p className="login-desc">Masuk untuk mencatat, mengelola, dan memantau valuasi kartu legendamu.</p>

          <button className="google-btn" onClick={handleGoogleLogin} disabled={isLoggingIn}>
            {isLoggingIn ? "Memverifikasi..." : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.71 17.58V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                  <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.58C14.72 18.24 13.47 18.64 12 18.64C9.15 18.64 6.74 16.72 5.88 14.13H2.21V16.98C4.01 20.55 7.7 23 12 23Z" fill="#34A853"/>
                  <path d="M5.88 14.13C5.66 13.47 5.54 12.75 5.54 12C5.54 11.25 5.66 10.53 5.88 9.87V7.02H2.21C1.47 8.51 1.04 10.2 1.04 12C1.04 13.8 1.47 15.49 2.21 16.98L5.88 14.13Z" fill="#FBBC05"/>
                  <path d="M12 5.36C13.62 5.36 15.06 5.92 16.2 7.01L19.36 3.85C17.46 2.07 14.97 1 12 1C7.7 1 4.01 3.45 2.21 7.02L5.88 9.87C6.74 7.28 9.15 5.36 12 5.36Z" fill="#EA4335"/>
                </svg>
                Masuk dengan Google
              </>
            )}
          </button>

          {error && <div className="error-msg">{error}</div>}

          <div className="legal-text">
            Dengan masuk, Anda menyetujui <br/>
            <Link href="/terms">Syarat Ketentuan</Link> dan <Link href="/privacy">Kebijakan Privasi</Link>.
          </div>
        </div>
      </div>
    </>
  );
}