"use client";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("koleksi");
  const [cards, setCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Proteksi & Fetch Data
  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
      return;
    }

    if (profile) {
      async function fetchMyCards() {
        try {
          const q = query(
            collection(db, "kartulog_cards"),
            where("uid", "==", profile?.uid),
            orderBy("createdAt", "desc")
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCards(data);
        } catch (error) {
          console.error("Gagal menarik data kartu:", error);
        } finally {
          setLoadingCards(false);
        }
      }
      fetchMyCards();
    }
  }, [profile, loading, router]);

  if (loading || !profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#060B19", display: "flex", alignItems: "center", justifyContent: "center", color: "#00F0FF" }}>
        Membuka brankas...
      </div>
    );
  }

  function handleLogout() {
    auth.signOut();
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #060B19; color: #E2E8F0; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        
        :root {
          --neon-cyan: #00F0FF; --neon-purple: #8A2BE2;
          --navy-card: #0B132B; --navy-border: #1C2A4A; --text-muted: #94A3B8;
        }

        .dash-nav { position: sticky; top: 0; z-index: 100; background: rgba(6, 11, 25, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--navy-border); padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
        .logo-wrap { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .logo-icon { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan)); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; color: #fff; }
        .logo-text { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #fff; }
        
        .nav-right { display: flex; align-items: center; gap: 20px; }
        .btn-logout { background: transparent; border: 1px solid var(--navy-border); color: var(--text-muted); padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-logout:hover { color: #EF4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
        .user-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--neon-cyan); object-fit: cover; }

        .dash-main { max-width: 1000px; margin: 0 auto; padding: 40px 24px 100px; }
        .profile-section { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 24px; }
        .greeting { font-size: 14px; color: var(--neon-cyan); font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.1em; }
        .username { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #fff; }
        
        .stats-card { display: flex; gap: 32px; background: var(--navy-card); border: 1px solid var(--navy-border); padding: 20px 32px; border-radius: 16px; }
        .stat-item { display: flex; flex-direction: column; gap: 4px; }
        .stat-label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
        .stat-value { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #fff; }
        
        .tab-menu { display: flex; gap: 32px; border-bottom: 1px solid var(--navy-border); margin-bottom: 32px; }
        .tab-item { padding: 12px 0; font-size: 15px; font-weight: 600; color: var(--text-muted); cursor: pointer; position: relative; }
        .tab-item:hover { color: #fff; }
        .tab-item.active { color: var(--neon-cyan); }
        .tab-item.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--neon-cyan); box-shadow: 0 -2px 10px rgba(0, 240, 255, 0.5); }

        .header-action { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .btn-add { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 8px; background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan)); color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 15px rgba(0, 240, 255, 0.2); }
        .btn-add:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 240, 255, 0.4); }

        /* GRID KARTU */
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
        .card-item { background: var(--navy-card); border: 1px solid var(--navy-border); border-radius: 16px; overflow: hidden; transition: transform 0.2s, border-color 0.2s; text-decoration: none; display: flex; flex-direction: column; }
        .card-item:hover { transform: translateY(-4px); border-color: var(--neon-cyan); box-shadow: 0 10px 30px rgba(0,240,255,0.1); }
        .card-image-wrap { width: 100%; aspect-ratio: 2.5/3.5; background: #000; position: relative; }
        .card-image { width: 100%; height: 100%; object-fit: contain; }
        .card-no-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; color: var(--navy-border); }
        .card-content { padding: 16px; flex: 1; display: flex; flex-direction: column; }
        .card-game { font-size: 11px; font-weight: 700; color: var(--neon-purple); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px; }
        .card-name { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-set { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
        .card-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--navy-border); }
        .card-price { font-size: 14px; font-weight: 700; color: var(--neon-cyan); }
        .card-grade { font-size: 11px; padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.1); color: #fff; font-weight: 600; }

        .empty-state { text-align: center; padding: 80px 20px; background: rgba(11, 19, 43, 0.4); border: 1px dashed var(--navy-border); border-radius: 20px; }
        .empty-icon { font-size: 48px; margin-bottom: 16px; filter: grayscale(1) opacity(0.5); }
      `}</style>

      <nav className="dash-nav">
        <Link href="/" className="logo-wrap">
          <div className="logo-icon">K</div>
          <span className="logo-text">KartuLog</span>
        </Link>
        <div className="nav-right">
          <button className="btn-logout" onClick={handleLogout}>Keluar</button>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="user-avatar" />
          ) : (
            <div className="user-avatar" style={{ background: "var(--navy-border)" }} />
          )}
        </div>
      </nav>

      <main className="dash-main">
        <div className="profile-section">
          <div>
            <div className="greeting">Selamat datang kembali,</div>
            <h1 className="username">{profile.displayName}</h1>
          </div>
          <div className="stats-card">
            <div className="stat-item">
              <span className="stat-label">Total Kartu</span>
              <span className="stat-value">{cards.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Valuasi</span>
              <span className="stat-value">
                Rp {cards.reduce((sum, card) => sum + (card.estimatedValue || card.hpp || 0), 0).toLocaleString("id")}
              </span>
            </div>
          </div>
        </div>

        <div className="tab-menu">
          <div className={`tab-item ${activeTab === "koleksi" ? "active" : ""}`} onClick={() => setActiveTab("koleksi")}>Koleksi Saya</div>
          <div className={`tab-item ${activeTab === "feed" ? "active" : ""}`} onClick={() => setActiveTab("feed")}>TCG Feed 🌟</div>
        </div>

        {activeTab === "koleksi" && (
          <>
            <div className="header-action">
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Brankas Pribadi</h2>
              <Link href="/collection/new" className="btn-add"><span>+</span> Tambah Kartu</Link>
            </div>

            {loadingCards ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Mengambil data dari brankas...</div>
            ) : cards.length > 0 ? (
              <div className="cards-grid">
                {cards.map(card => (
                  <Link href={`#`} key={card.id} className="card-item">
                    <div className="card-image-wrap">
                      {card.photoFront ? (
                        <img src={card.photoFront} alt={card.name} className="card-image" />
                      ) : (
                        <div className="card-no-image">🎴</div>
                      )}
                    </div>
                    <div className="card-content">
                      <div className="card-game">{card.game}</div>
                      <div className="card-name">{card.name}</div>
                      <div className="card-set">{card.expansion || "Unknown Set"}</div>
                      <div className="card-footer">
                        <div className="card-price">Rp {(card.estimatedValue || card.hpp || 0).toLocaleString("id")}</div>
                        <div className="card-grade">{card.gradingAgency === "Raw (Ungraded)" ? card.condition : `${card.gradingAgency} ${card.gradeScore}`}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎴</div>
                <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>Brankas masih kosong</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Mulai bangun portofolio TCG kamu.</p>
                <Link href="/collection/new" className="btn-add">Tambah Kartu Baru</Link>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}