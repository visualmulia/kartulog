"use client";
import { useEffect, useState, use } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

const GAME_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "Pokémon TCG":          { bg: "rgba(255,203,5,0.1)",   border: "rgba(255,203,5,0.3)",   text: "#FFCB05", badge: "🎴" },
  "One Piece Card Game":  { bg: "rgba(220,38,38,0.1)",   border: "rgba(220,38,38,0.3)",   text: "#EF4444", badge: "🏴‍☠️" },
  "Yu-Gi-Oh!":            { bg: "rgba(138,43,226,0.1)",  border: "rgba(138,43,226,0.3)",  text: "#8A2BE2", badge: "⚔️" },
  "Magic: The Gathering": { bg: "rgba(0,240,255,0.1)",   border: "rgba(0,240,255,0.3)",   text: "#00F0FF", badge: "🧙" },
  "Lainnya":              { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", text: "#94A3B8", badge: "🃏" },
};

function fmtIDR(n: number) {
  if (n >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1) + " jt";
  if (n >= 1_000) return "Rp " + (n / 1_000).toFixed(0) + " rb";
  return "Rp " + n.toLocaleString("id");
}

interface CardItem {
  id: string;
  uid: string;
  name: string;
  game: string;
  expansion: string;
  cardNumber: string;
  rarity: string;
  condition: string;
  gradingAgency: string;
  gradeScore: string;
  slabSerial: string;
  hpp: number;
  estimatedValue: number;
  notes: string;
  isPublic: boolean;
  photoFront: string;
  photoBack: string;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  totalItems: number;
  totalHPP: number;
}

export default function PublicPortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { profile: currentUser } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeGame, setActiveGame] = useState("all");
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);

  useEffect(() => { fetchPortfolio(); }, [username]);

  async function fetchPortfolio() {
    try {
      const userQ = query(collection(db, "koinlog_users"), where("username", "==", username));
      const userSnap = await getDocs(userQ);
      if (userSnap.empty) { setNotFound(true); setLoading(false); return; }

      const userData = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as any;
      setUser(userData);

      const cardsQ = query(
        collection(db, "kartulog_cards"),
        where("uid", "==", userData.uid),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );
      const cardsSnap = await getDocs(cardsQ);
      setCards(cardsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CardItem)));
    } catch (e) {
      console.error("Error:", e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const games = ["all", ...Array.from(new Set(cards.map(c => c.game)))];
  const filtered = activeGame === "all" ? cards : cards.filter(c => c.game === activeGame);
  const totalEstimated = cards.reduce((s, c) => s + (c.estimatedValue || 0), 0);
  const totalHPP = cards.reduce((s, c) => s + (c.hpp || 0), 0);
  const gainLoss = totalEstimated - totalHPP;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060B19", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
        <div style={{ color: "#00F0FF", fontSize: 14 }}>Membuka brankas...</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#060B19", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 24, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Brankas tidak ditemukan</div>
        <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>Username <strong style={{ color: "#fff" }}>{username}</strong> belum terdaftar di KartuLog.</div>
        <a href="/" style={{ padding: "12px 28px", borderRadius: 10, background: "linear-gradient(135deg,#8A2BE2,#00F0FF)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          Daftar KartuLog Gratis
        </a>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{overflow-x:hidden}
        body{font-family:'Inter',sans-serif;background:#060B19;color:#E2E8F0}
        :root{
          --neon-cyan:#00F0FF;--neon-purple:#8A2BE2;
          --navy-surface:#0B132B;--navy-border:#1C2A4A;--text-muted:#94A3B8;
        }

        /* HEADER */
        .pf-header{background:linear-gradient(135deg,#0B132B,#060B19);border-bottom:1px solid var(--navy-border);padding:40px 24px 80px;position:relative;overflow:hidden}
        .pf-header::before{content:'';position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(138,43,226,0.12),transparent 70%);top:-150px;right:-100px;pointer-events:none}
        .pf-header::after{content:'';position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(0,240,255,0.08),transparent 70%);bottom:-100px;left:-50px;pointer-events:none}

        .pf-topbar{display:flex;align-items:center;justify-content:space-between;max-width:900px;margin:0 auto 32px}
        .pf-brand{display:flex;align-items:center;gap:8px;text-decoration:none}
        .pf-brand-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:#fff}
        .pf-brand-text{font-family:'Outfit',sans-serif;font-size:17px;font-weight:800;color:rgba(255,255,255,.7)}
        .pf-cta{padding:8px 18px;border-radius:8px;background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));color:#fff;font-size:12.5px;font-weight:700;text-decoration:none;transition:all .2s}
        .pf-cta:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(0,240,255,0.3)}

        .pf-profile{max-width:900px;margin:0 auto;display:flex;align-items:flex-end;gap:20px}
        .pf-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));border:2px solid rgba(0,240,255,0.3);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-size:26px;font-weight:800;color:#fff;flex-shrink:0;overflow:hidden;box-shadow:0 0 20px rgba(0,240,255,0.2)}
        .pf-avatar img{width:100%;height:100%;object-fit:cover}
        .pf-info{flex:1}
        .pf-name{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;color:#fff;margin-bottom:4px}
        .pf-meta{font-size:13px;color:var(--text-muted)}

        /* BODY */
        .pf-body{max-width:900px;margin:-40px auto 0;padding:0 24px 60px;position:relative;z-index:1}

        /* STATS */
        .pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
        .pf-stat{background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:14px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,.3)}
        .pf-stat-label{font-size:10.5px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .pf-stat-value{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:#fff;line-height:1}

        /* GAME FILTER */
        .pf-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
        .pf-filter-btn{padding:6px 14px;border-radius:20px;border:1.5px solid var(--navy-border);background:transparent;font-size:12.5px;font-weight:600;color:var(--text-muted);cursor:pointer;transition:all .15s;font-family:inherit}
        .pf-filter-btn:hover{border-color:rgba(0,240,255,0.3);color:#fff}
        .pf-filter-btn.active{border-color:var(--neon-cyan);background:rgba(0,240,255,0.1);color:var(--neon-cyan)}

        /* CARDS GRID */
        .pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
        .pf-card{background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:14px;overflow:hidden;cursor:pointer;transition:all .2s}
        .pf-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,0.5)}
        .pf-card-img{width:100%;aspect-ratio:2.5/3.5;background:#000;display:flex;align-items:center;justify-content:center;font-size:48px;position:relative;overflow:hidden}
        .pf-card-img img{width:100%;height:100%;object-fit:contain}
        .pf-card-body{padding:12px}
        .pf-card-game{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px}
        .pf-card-name{font-size:14px;font-weight:700;color:#fff;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pf-card-set{font-size:12px;color:var(--text-muted);margin-bottom:8px}
        .pf-card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--navy-border)}
        .pf-card-price{font-size:13px;font-weight:700;color:var(--neon-cyan)}
        .pf-card-grade{font-size:10px;padding:3px 7px;border-radius:4px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-weight:600}

        /* EMPTY */
        .pf-empty{text-align:center;padding:80px 20px;background:rgba(11,19,43,0.4);border:1px dashed var(--navy-border);border-radius:20px}

        /* MODAL */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
        .modal-box{background:#0B132B;border:1px solid var(--navy-border);border-radius:20px;width:100%;max-width:500px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.6);max-height:90vh;overflow-y:auto}
        .modal-img{width:100%;aspect-ratio:2.5/3.5;background:#000;display:flex;align-items:center;justify-content:center;font-size:80px;position:relative;max-height:320px}
        .modal-img img{width:100%;height:100%;object-fit:contain}
        .modal-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .modal-body{padding:24px}
        .modal-game{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px}
        .modal-name{font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:4px}
        .modal-sub{font-size:13px;color:var(--text-muted);margin-bottom:20px}
        .modal-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(28,42,74,0.6);font-size:13.5px}
        .modal-row:last-child{border-bottom:none}
        .modal-key{color:var(--text-muted)}
        .modal-val{font-weight:600;color:#fff;text-align:right;max-width:60%}
        .modal-photos{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
        .modal-photo{border-radius:8px;overflow:hidden;background:#000;aspect-ratio:2.5/3.5;display:flex;align-items:center;justify-content:center}
        .modal-photo img{width:100%;height:100%;object-fit:contain}
        .modal-photo-label{font-size:11px;color:var(--text-muted);margin-bottom:4px}

        /* FOOTER */
        .pf-footer{text-align:center;padding:32px 24px;border-top:1px solid var(--navy-border);margin-top:40px}
        .pf-footer-brand{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent}

        @media(max-width:600px){
          .pf-header{padding:28px 20px 70px}
          .pf-body{padding:0 16px 48px}
          .pf-stats{grid-template-columns:1fr 1fr}
          .pf-grid{grid-template-columns:1fr 1fr}
          .pf-stat:last-child{grid-column:span 2}
        }
        @media(max-width:380px){
          .pf-grid{grid-template-columns:1fr}
          .pf-stat:last-child{grid-column:span 1}
        }
      `}</style>

      {/* HEADER */}
      <div className="pf-header">
        <div className="pf-topbar">
          <a href="/" className="pf-brand">
            <div className="pf-brand-icon">K</div>
            <span className="pf-brand-text">KartuLog</span>
          </a>
          {!currentUser && (
            <a href="/login" className="pf-cta">Buat Brankas Kamu →</a>
          )}
        </div>
        <div className="pf-profile">
          <div className="pf-avatar">
            {user?.photoURL
              ? <img src={user.photoURL} alt={user.displayName} />
              : (user?.displayName ?? "?").slice(0, 2).toUpperCase()
            }
          </div>
          <div className="pf-info">
            <div className="pf-name">{user?.displayName}</div>
            <div className="pf-meta">@{user?.username} · {cards.length} kartu publik</div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="pf-body">

        {/* STATS */}
        <div className="pf-stats">
          <div className="pf-stat">
            <div className="pf-stat-label">Total Kartu</div>
            <div className="pf-stat-value">{cards.length}</div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Total HPP</div>
            <div className="pf-stat-value" style={{ fontSize: totalHPP > 9999999 ? 14 : 20 }}>
              {totalHPP > 0 ? fmtIDR(totalHPP) : "—"}
            </div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Est. Nilai</div>
            <div className="pf-stat-value" style={{ fontSize: totalEstimated > 9999999 ? 14 : 20, color: totalEstimated > 0 ? "var(--neon-cyan)" : "#fff" }}>
              {totalEstimated > 0 ? fmtIDR(totalEstimated) : "—"}
            </div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Gain/Loss</div>
            <div className="pf-stat-value" style={{ fontSize: Math.abs(gainLoss) > 9999999 ? 14 : 20, color: gainLoss >= 0 ? "#10B981" : "#EF4444" }}>
              {totalEstimated > 0 ? `${gainLoss >= 0 ? "+" : ""}${fmtIDR(gainLoss)}` : "—"}
            </div>
          </div>
        </div>

        {/* GAME FILTER */}
        {games.length > 2 && (
          <div className="pf-filter">
            {games.map(game => {
              const color = GAME_COLORS[game];
              return (
                <button
                  key={game}
                  className={`pf-filter-btn${activeGame === game ? " active" : ""}`}
                  onClick={() => setActiveGame(game)}
                  style={activeGame === game && game !== "all" ? {
                    borderColor: color?.border,
                    background: color?.bg,
                    color: color?.text,
                  } : {}}
                >
                  {game === "all" ? "Semua 🃏" : `${GAME_COLORS[game]?.badge ?? "🎴"} ${game}`}
                </button>
              );
            })}
          </div>
        )}

        {/* CARDS GRID */}
        {filtered.length === 0 ? (
          <div className="pf-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎴</div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Belum ada kartu di sini
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Coba pilih game lain</div>
          </div>
        ) : (
          <div className="pf-grid">
            {filtered.map(card => {
              const gameColor = GAME_COLORS[card.game] ?? GAME_COLORS["Lainnya"];
              return (
                <div key={card.id} className="pf-card" onClick={() => setSelectedCard(card)}
                  style={{ borderColor: activeGame === card.game ? gameColor.border : undefined }}
                >
                  <div className="pf-card-img">
                    {card.photoFront
                      ? <img src={card.photoFront} alt={card.name} />
                      : <span>{gameColor.badge}</span>
                    }
                  </div>
                  <div className="pf-card-body">
                    <div className="pf-card-game" style={{ color: gameColor.text }}>{card.game}</div>
                    <div className="pf-card-name">{card.name}</div>
                    <div className="pf-card-set">{card.expansion || card.rarity || "—"}</div>
                    <div className="pf-card-footer">
                      <div className="pf-card-price">
                        {card.estimatedValue > 0 ? fmtIDR(card.estimatedValue) : fmtIDR(card.hpp || 0)}
                      </div>
                      <div className="pf-card-grade">
                        {card.gradingAgency === "Raw (Ungraded)"
                          ? card.condition?.split(" (")[0] ?? "Raw"
                          : `${card.gradingAgency} ${card.gradeScore}`
                        }
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <div className="pf-footer">
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>Brankas ini dikelola dengan</div>
          <div className="pf-footer-brand">KartuLog</div>
          <div style={{ marginTop: 10 }}>
            <a href="/" style={{ fontSize: 12.5, color: "var(--neon-cyan)", textDecoration: "none", fontWeight: 600 }}>
              Buat brankas koleksimu sendiri →
            </a>
          </div>
        </div>
      </div>

      {/* CARD DETAIL MODAL */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-img">
              {selectedCard.photoFront
                ? <img src={selectedCard.photoFront} alt={selectedCard.name} />
                : <span>{GAME_COLORS[selectedCard.game]?.badge ?? "🎴"}</span>
              }
              <button className="modal-close" onClick={() => setSelectedCard(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-game" style={{ color: GAME_COLORS[selectedCard.game]?.text ?? "#94A3B8" }}>
                {selectedCard.game}
              </div>
              <div className="modal-name">{selectedCard.name}</div>
              <div className="modal-sub">
                {[selectedCard.expansion, selectedCard.cardNumber, selectedCard.rarity].filter(Boolean).join(" · ")}
              </div>

              {/* Foto belakang */}
              {selectedCard.photoBack && (
                <div style={{ marginBottom: 16 }}>
                  <div className="modal-photo-label">Foto Belakang</div>
                  <div className="modal-photo">
                    <img src={selectedCard.photoBack} alt="Back" />
                  </div>
                </div>
              )}

              {/* Detail rows */}
              {[
                ["Kondisi", selectedCard.condition],
                ["Grading", selectedCard.gradingAgency === "Raw (Ungraded)"
                  ? "Raw (Ungraded)"
                  : `${selectedCard.gradingAgency} ${selectedCard.gradeScore}`
                ],
                ...(selectedCard.slabSerial ? [["No. Slab", selectedCard.slabSerial]] : []),
                ...(selectedCard.estimatedValue > 0 ? [["Est. Nilai", fmtIDR(selectedCard.estimatedValue)]] : []),
                ...(selectedCard.notes ? [["Catatan", selectedCard.notes]] : []),
              ].map(([k, v]) => (
                <div key={k} className="modal-row">
                  <span className="modal-key">{k}</span>
                  <span className="modal-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}