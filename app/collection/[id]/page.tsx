"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc, setDoc, increment } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const CONDITIONS = ["Mint (M)", "Near Mint (NM)", "Lightly Played (LP)", "Moderately Played (MP)", "Heavily Played (HP)", "Damaged"];
const GRADING_AGENCIES = ["Raw (Ungraded)", "PSA", "BGS", "CGC", "Lainnya"];
const RARITIES = ["Common", "Uncommon", "Rare", "Holo Rare", "Ultra Rare", "Secret Rare", "Alternate Art", "Promo", "Lainnya"];
const GAMES = ["Pokémon TCG", "One Piece Card Game", "Yu-Gi-Oh!", "Magic: The Gathering", "Lainnya"];

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
  buyDate: string;
  estimatedValue: number;
  notes: string;
  isPublic: boolean;
  photoFront: string;
  photoBack: string;
  createdAt: any;
  updatedAt: any;
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [card, setCard] = useState<CardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [estimatingAI, setEstimatingAI] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState<Partial<CardItem>>({});

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function updateForm(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Fetch card data
  useEffect(() => {
    if (!profile) return;
    async function fetchCard() {
      try {
        const docRef = doc(db, "kartulog_cards", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as CardItem;
          if (data.uid !== profile?.uid) { router.push("/dashboard"); return; }
          setCard(data);
          setForm(data);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Gagal memuat kartu:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [id, profile, router]);

  // AI Appraisal via Claude API route
  async function handleEstimateAI() {
  if (!form.name || !form.game) {
    showToast("Nama kartu dan game harus ada!", "error");
    return;
  }
  setEstimatingAI(true);
  try {
    // Coba real-time price dulu via card-price API
    const priceRes = await fetch("/api/card-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        game: form.game,
        setName: form.expansion,
        cardNumber: form.cardNumber,
      }),
    });
    const priceData = await priceRes.json();

    if (priceData.found && priceData.bestEstimateIDR > 0) {
      updateForm("estimatedValue", priceData.bestEstimateIDR);
      const source = form.game === "Pokémon TCG" ? "TCGdex"
        : form.game === "Yu-Gi-Oh!" ? "YGOPRODeck"
        : form.game === "Magic: The Gathering" ? "Scryfall"
        : "database";
      showToast(`✅ Harga real dari ${source}: Rp ${priceData.bestEstimateIDR.toLocaleString("id")}!`);
      return;
    }

    // Fallback ke Claude AI
    const aiRes = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        game: form.game,
        expansion: form.expansion,
        cardNumber: form.cardNumber,
        rarity: form.rarity,
        condition: form.condition,
        gradingAgency: form.gradingAgency,
        gradeScore: form.gradeScore,
      }),
    });
    const aiData = await aiRes.json();

    if (aiData.value && parseInt(aiData.value) > 0) {
      updateForm("estimatedValue", parseInt(aiData.value));
      showToast("🤖 Estimasi AI (data tidak ditemukan di database)", "success");
    } else {
      showToast("Tidak bisa menaksir kartu ini.", "error");
    }
  } catch {
    showToast("Gagal mengambil data harga.", "error");
  } finally {
    setEstimatingAI(false);
  }
}

  // Save edit
  async function handleSave() {
    if (!card || !profile) return;
    setSaving(true);
    try {
      const oldHPP = card.hpp || 0;
      const newHPP = Number(form.hpp) || 0;
      const hppDiff = newHPP - oldHPP;

      await updateDoc(doc(db, "kartulog_cards", id), {
        ...form,
        hpp: newHPP,
        estimatedValue: Number(form.estimatedValue) || 0,
        updatedAt: new Date(),
      });

      if (hppDiff !== 0) {
        await setDoc(doc(db, "koinlog_users", profile.uid), {
          totalHPP: increment(hppDiff),
        }, { merge: true });
      }

      setCard({ ...card, ...form, hpp: newHPP, estimatedValue: Number(form.estimatedValue) } as CardItem);
      setIsEditing(false);
      showToast("Perubahan berhasil disimpan!");
    } catch (error: any) {
      showToast("Gagal menyimpan: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Delete card
  async function handleDelete() {
    if (!card || !profile) return;
    setDeleting(true);
    try {
      if (card.photoFront) {
        try { await deleteObject(ref(storage, card.photoFront)); } catch {}
      }
      if (card.photoBack) {
        try { await deleteObject(ref(storage, card.photoBack)); } catch {}
      }
      await deleteDoc(doc(db, "kartulog_cards", id));
      await setDoc(doc(db, "koinlog_users", profile.uid), {
        totalItems: increment(-1),
        totalHPP: increment(-(card.hpp || 0)),
      }, { merge: true });
      router.push("/dashboard");
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
      setDeleting(false);
    }
  }

  function fmtIDR(n: number) {
    if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1) + " jt";
    if (n >= 1_000) return "Rp " + (n / 1_000).toFixed(0) + " rb";
    return "Rp " + n.toLocaleString("id");
  }

  const gainLoss = card ? (card.estimatedValue || 0) - (card.hpp || 0) : 0;
  const gainPct = card?.hpp ? ((gainLoss / card.hpp) * 100).toFixed(1) : "0";

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", background: "#060B19", display: "flex", alignItems: "center", justifyContent: "center", color: "#00F0FF", fontFamily: "Inter, sans-serif" }}>
      Membuka brankas...
    </div>
  );

  if (!card || !profile) return null;

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;background:#060B19;color:#E2E8F0;overflow-x:hidden}
        :root{
          --neon-cyan:#00F0FF;--neon-purple:#8A2BE2;--neon-green:#10B981;--neon-red:#EF4444;
          --navy-surface:#0B132B;--navy-border:#1C2A4A;--text-muted:#94A3B8;
          --r-sm:8px;--r-md:12px;--r-lg:16px;
        }

        /* NAV */
        .top-nav{position:sticky;top:0;z-index:100;background:rgba(6,11,25,.9);backdrop-filter:blur(20px);border-bottom:1px solid var(--navy-border);padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .btn-back{color:var(--text-muted);text-decoration:none;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;transition:color .2s}
        .btn-back:hover{color:#fff}
        .nav-actions{display:flex;gap:10px}
        .btn-edit{padding:8px 20px;border-radius:var(--r-sm);background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:all .2s}
        .btn-edit:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(0,240,255,0.3)}
        .btn-delete{padding:8px 16px;border-radius:var(--r-sm);background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#EF4444;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
        .btn-delete:hover{background:rgba(239,68,68,0.2)}

        /* BODY */
        .page-body{max-width:900px;margin:0 auto;padding:32px 24px 80px}

        /* CARD HERO */
        .card-hero{display:grid;grid-template-columns:320px 1fr;gap:32px;margin-bottom:32px;align-items:start}
        .card-photos{display:flex;flex-direction:column;gap:12px}
        .photo-main{width:100%;aspect-ratio:2.5/3.5;background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:64px;position:relative}
        .photo-main img{width:100%;height:100%;object-fit:contain}
        .photo-back-thumb{width:100%;height:80px;background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer}
        .photo-back-thumb img{width:100%;height:100%;object-fit:contain}

        /* Card Info */
        .card-info{}
        .card-game-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(138,43,226,0.15);border:1px solid rgba(138,43,226,0.3);border-radius:20px;font-size:12px;font-weight:700;color:var(--neon-purple);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em}
        .card-title{font-family:'Outfit',sans-serif;font-size:32px;font-weight:800;color:#fff;margin-bottom:6px;line-height:1.2}
        .card-subtitle{font-size:15px;color:var(--text-muted);margin-bottom:24px}

        /* Value boxes */
        .value-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
        .value-box{background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:var(--r-md);padding:16px}
        .value-label{font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .value-amount{font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:#fff}
        .gain-box{background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:var(--r-md);padding:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .gain-label{font-size:12px;color:var(--text-muted);margin-bottom:4px}
        .gain-value{font-size:20px;font-weight:800}

        /* Data sections */
        .data-section{background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:var(--r-lg);padding:24px;margin-bottom:16px}
        .data-section-title{font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .data-section-title::before{content:'';width:3px;height:14px;background:var(--neon-cyan);border-radius:2px}
        .data-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(28,42,74,0.6);font-size:14px}
        .data-row:last-child{border-bottom:none;padding-bottom:0}
        .data-key{color:var(--text-muted)}
        .data-val{font-weight:600;color:#fff;text-align:right;max-width:60%}

        /* Badge */
        .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700}
        .badge-public{background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3)}
        .badge-private{background:rgba(100,116,139,0.15);color:#94A3B8;border:1px solid rgba(100,116,139,0.3)}
        .badge-grade{background:rgba(138,43,226,0.15);color:var(--neon-purple);border:1px solid rgba(138,43,226,0.3)}

        /* EDIT FORM */
        .form-group{margin-bottom:20px}
        .form-label{display:block;font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:7px}
        .form-input,.form-select{width:100%;padding:11px 14px;background:rgba(6,11,25,0.6);border:1px solid var(--navy-border);border-radius:var(--r-sm);color:#fff;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}
        .form-input:focus,.form-select:focus{border-color:var(--neon-cyan);box-shadow:0 0 8px rgba(0,240,255,0.1)}
        .form-input::placeholder{color:#4A5568}
        .form-select option{background:var(--navy-surface)}
        .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .ai-wrap{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
        .btn-ai{background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));color:#fff;border:none;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
        .btn-ai:disabled{opacity:0.5;cursor:not-allowed}
        .ai-disclaimer{font-size:11px;color:var(--text-muted);margin-top:5px;display:flex;align-items:flex-start;gap:4px;line-height:1.5}
        .edit-actions{display:flex;gap:12px;margin-top:28px;justify-content:flex-end}
        .btn-cancel-edit{padding:11px 24px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--navy-border);color:var(--text-muted);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .btn-cancel-edit:hover{color:#fff;border-color:rgba(255,255,255,0.2)}
        .btn-save{padding:11px 28px;border-radius:var(--r-sm);background:linear-gradient(135deg,var(--neon-cyan),var(--neon-purple));color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:all .2s}
        .btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 15px rgba(0,240,255,0.3)}
        .btn-save:disabled{opacity:0.6;cursor:not-allowed}

        /* Delete confirm modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
        .modal-box{background:var(--navy-surface);border:1px solid rgba(239,68,68,0.3);border-radius:20px;padding:32px;max-width:420px;width:100%;text-align:center}
        .modal-icon{font-size:48px;margin-bottom:16px}
        .modal-title{font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:8px}
        .modal-desc{font-size:14px;color:var(--text-muted);margin-bottom:28px;line-height:1.6}
        .modal-btns{display:flex;gap:12px;justify-content:center}
        .btn-confirm-cancel{padding:11px 24px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--navy-border);color:var(--text-muted);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn-confirm-delete{padding:11px 24px;border-radius:var(--r-sm);background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:inherit}

        /* Toast */
        .toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:30px;font-size:13.5px;font-weight:600;color:#fff;z-index:300;box-shadow:0 10px 30px rgba(0,0,0,0.5);white-space:nowrap;display:flex;align-items:center;gap:8px}
        .toast.success{background:linear-gradient(135deg,#10B981,#059669)}
        .toast.error{background:linear-gradient(135deg,#EF4444,#B91C1C)}

        @media(max-width:768px){
          .card-hero{grid-template-columns:1fr}
          .card-photos{flex-direction:row;align-items:flex-start}
          .photo-main{flex:1}
          .photo-back-thumb{width:80px;height:100px;flex-shrink:0}
          .form-grid-2{grid-template-columns:1fr}
          .value-row{grid-template-columns:1fr}
        }
      `}</style>

      {/* NAV */}
      <nav className="top-nav">
        <Link href="/dashboard" className="btn-back">← Brankas</Link>
        <div className="nav-actions">
          {!isEditing && (
            <>
              <button className="btn-edit" onClick={() => setIsEditing(true)}>✏️ Edit</button>
              <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>🗑️</button>
            </>
          )}
        </div>
      </nav>

      <div className="page-body">

        {/* VIEW MODE */}
        {!isEditing && (
          <>
            <div className="card-hero">
              {/* Foto */}
              <div className="card-photos">
                <div className="photo-main">
                  {card.photoFront
                    ? <img src={card.photoFront} alt={card.name} />
                    : <span>🎴</span>
                  }
                </div>
                {card.photoBack && (
                  <div className="photo-back-thumb">
                    <img src={card.photoBack} alt="Back" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="card-info">
                <div className="card-game-badge">🎮 {card.game}</div>
                <h1 className="card-title">{card.name}</h1>
                <p className="card-subtitle">
                  {[card.expansion, card.cardNumber, card.rarity].filter(Boolean).join(" · ")}
                </p>

                {/* Values */}
                <div className="value-row">
                  <div className="value-box">
                    <div className="value-label">Harga Beli (HPP)</div>
                    <div className="value-amount">{fmtIDR(card.hpp || 0)}</div>
                  </div>
                  <div className="value-box">
                    <div className="value-label">Est. Nilai Pasar</div>
                    <div className="value-amount" style={{ color: card.estimatedValue > 0 ? "var(--neon-cyan)" : "var(--text-muted)" }}>
                      {card.estimatedValue > 0 ? fmtIDR(card.estimatedValue) : "—"}
                    </div>
                  </div>
                </div>

                {/* Gain/Loss */}
                {card.estimatedValue > 0 && (
                  <div className="gain-box">
                    <div>
                      <div className="gain-label">Potensi Keuntungan</div>
                      <div className="gain-value" style={{ color: gainLoss >= 0 ? "#10B981" : "#EF4444" }}>
                        {gainLoss >= 0 ? "+" : ""}{fmtIDR(gainLoss)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="gain-label">Persentase</div>
                      <div className="gain-value" style={{ color: gainLoss >= 0 ? "#10B981" : "#EF4444" }}>
                        {gainLoss >= 0 ? "+" : ""}{gainPct}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={`badge ${card.isPublic ? "badge-public" : "badge-private"}`}>
                    {card.isPublic ? "🌐 Publik" : "🔒 Privat"}
                  </span>
                  {card.gradingAgency !== "Raw (Ungraded)" && card.gradeScore && (
                    <span className="badge badge-grade">{card.gradingAgency} {card.gradeScore}</span>
                  )}
                  <span className="badge" style={{ background: "rgba(0,240,255,0.1)", color: "var(--neon-cyan)", border: "1px solid rgba(0,240,255,0.2)" }}>
                    {card.condition}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail sections */}
            <div className="data-section">
              <div className="data-section-title">Identitas Kartu</div>
              {[
                ["Game", card.game],
                ["Set / Expansion", card.expansion || "—"],
                ["Nomor Kartu", card.cardNumber || "—"],
                ["Rarity", card.rarity || "—"],
              ].map(([k, v]) => (
                <div key={k} className="data-row">
                  <span className="data-key">{k}</span>
                  <span className="data-val">{v}</span>
                </div>
              ))}
            </div>

            <div className="data-section">
              <div className="data-section-title">Kondisi & Grading</div>
              {[
                ["Kondisi", card.condition],
                ["Grading Agency", card.gradingAgency],
                ...(card.gradingAgency !== "Raw (Ungraded)" ? [
                  ["Score", card.gradeScore || "—"],
                  ["No. Slab", card.slabSerial || "—"],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} className="data-row">
                  <span className="data-key">{k}</span>
                  <span className="data-val">{v}</span>
                </div>
              ))}
            </div>

            <div className="data-section">
              <div className="data-section-title">Data Finansial</div>
              {[
                ["Harga Beli (HPP)", fmtIDR(card.hpp || 0)],
                ["Est. Nilai Pasar", card.estimatedValue > 0 ? fmtIDR(card.estimatedValue) : "—"],
                ["Tanggal Beli", card.buyDate || "—"],
              ].map(([k, v]) => (
                <div key={k} className="data-row">
                  <span className="data-key">{k}</span>
                  <span className="data-val">{v}</span>
                </div>
              ))}
            </div>

            {card.notes && (
              <div className="data-section">
                <div className="data-section-title">Catatan</div>
                <p style={{ color: "#CBD5E1", fontSize: 14, lineHeight: 1.7 }}>{card.notes}</p>
              </div>
            )}
          </>
        )}

        {/* EDIT MODE */}
        {isEditing && (
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 24 }}>
              Edit Data Kartu
            </h2>

            <div className="data-section">
              <div className="data-section-title">Identitas Kartu</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Game</label>
                  <select className="form-select" value={form.game || ""} onChange={e => updateForm("game", e.target.value)}>
                    {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Kartu</label>
                  <input className="form-input" value={form.name || ""} onChange={e => updateForm("name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Set / Expansion</label>
                  <input className="form-input" value={form.expansion || ""} onChange={e => updateForm("expansion", e.target.value)} placeholder="e.g. 151, Romance Dawn" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nomor Kartu</label>
                  <input className="form-input" value={form.cardNumber || ""} onChange={e => updateForm("cardNumber", e.target.value)} placeholder="e.g. 199/165" />
                </div>
                <div className="form-group">
                  <label className="form-label">Rarity</label>
                  <select className="form-select" value={form.rarity || ""} onChange={e => updateForm("rarity", e.target.value)}>
                    <option value="">Pilih Rarity</option>
                    {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="data-section">
              <div className="data-section-title">Kondisi & Grading</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Kondisi</label>
                  <select className="form-select" value={form.condition || ""} onChange={e => updateForm("condition", e.target.value)}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Grading Agency</label>
                  <select className="form-select" value={form.gradingAgency || ""} onChange={e => updateForm("gradingAgency", e.target.value)}>
                    {GRADING_AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {form.gradingAgency !== "Raw (Ungraded)" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Score</label>
                      <input className="form-input" value={form.gradeScore || ""} onChange={e => updateForm("gradeScore", e.target.value)} placeholder="e.g. 10, 9.5" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. Slab Serial</label>
                      <input className="form-input" value={form.slabSerial || ""} onChange={e => updateForm("slabSerial", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="data-section">
              <div className="data-section-title">Data Finansial</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Harga Beli / HPP</label>
                  <input type="number" className="form-input" value={form.hpp || ""} onChange={e => updateForm("hpp", e.target.value)} />
                </div>
                <div className="form-group">
                  <div className="ai-wrap">
                    <label className="form-label" style={{ margin: 0 }}>Est. Nilai Pasar</label>
                    <button className="btn-ai" onClick={handleEstimateAI} disabled={estimatingAI} type="button">
                      {estimatingAI ? "⏳ Menaksir..." : "✨ AI Appraiser"}
                    </button>
                  </div>
                  <input type="number" className="form-input" value={form.estimatedValue || ""} onChange={e => updateForm("estimatedValue", e.target.value)} placeholder="Isi manual atau klik AI" />
                  <div className="ai-disclaimer">
                    <span>⚠️</span>
                    <span>Estimasi bersifat indikatif. Verifikasi dengan komunitas atau dealer.</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Beli</label>
                  <input type="date" className="form-input" value={form.buyDate || ""} onChange={e => updateForm("buyDate", e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Catatan</label>
                <textarea className="form-input" rows={3} value={form.notes || ""} onChange={e => updateForm("notes", e.target.value)} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
                <input type="checkbox" checked={form.isPublic || false} onChange={e => updateForm("isPublic", e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--neon-cyan)", flexShrink: 0 }} />
                <label className="form-label" style={{ margin: 0 }}>Tampilkan di Portfolio Publik</label>
              </div>
            </div>

            <div className="edit-actions">
              <button className="btn-cancel-edit" onClick={() => { setIsEditing(false); setForm(card); }}>Batal</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "✓ Simpan Perubahan"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <div className="modal-title">Hapus Kartu Ini?</div>
            <div className="modal-desc">
              <strong style={{ color: "#fff" }}>{card.name}</strong> akan dihapus permanen beserta fotonya. Tindakan ini tidak bisa dibatalkan.
            </div>
            <div className="modal-btns">
              <button className="btn-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Batal</button>
              <button className="btn-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </>
  );
}