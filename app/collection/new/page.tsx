"use client";
import imageCompression from "browser-image-compression";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Link from "next/link";

const GAMES = ["Pokémon TCG", "One Piece Card Game", "Yu-Gi-Oh!", "Magic: The Gathering", "Lainnya"];
const CONDITIONS = ["Mint (M)", "Near Mint (NM)", "Lightly Played (LP)", "Moderately Played (MP)", "Heavily Played (HP)", "Damaged"];
const GRADING_AGENCIES = ["Raw (Ungraded)", "PSA", "BGS", "CGC", "Lainnya"];
const RARITIES = ["Common", "Uncommon", "Rare", "Holo Rare", "Ultra Rare", "Secret Rare", "Alternate Art", "Promo", "Lainnya"];

export default function NewCardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [estimatingAI, setEstimatingAI] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    name: "", game: "", expansion: "", cardNumber: "", rarity: "",
    condition: "", gradingAgency: "Raw (Ungraded)", gradeScore: "", slabSerial: "",
    hpp: "", buyDate: "", estimatedValue: "", notes: "", isPublic: true,
  });

  const [photoFrontFile, setPhotoFrontFile] = useState<File | null>(null);
  const [photoBackFile, setPhotoBackFile] = useState<File | null>(null);
  const [photoFrontPreview, setPhotoFrontPreview] = useState("");
  const [photoBackPreview, setPhotoBackPreview] = useState("");

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function update(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handlePhotoSelect(side: "front" | "back", file: File) {
    const url = URL.createObjectURL(file);
    if (side === "front") { setPhotoFrontFile(file); setPhotoFrontPreview(url); }
    else { setPhotoBackFile(file); setPhotoBackPreview(url); }
  }

  async function uploadPhoto(file: File, path: string): Promise<string> {
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
    return new Promise(async (resolve, reject) => {
      try {
        let fileToUpload = file;
        try { fileToUpload = await imageCompression(file, options); }
        catch (compErr) { console.warn("Kompresi gagal, pakai file asli:", compErr); }

        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        uploadTask.on(
          "state_changed",
          () => {},
          (error) => { console.error("Upload error:", error); reject(error); },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (urlErr) { reject(urlErr); }
          }
        );
      } catch (error) { reject(error); }
    });
  }

  // ✅ FIX: Pakai Claude API route (server-side) — API key tidak expose ke browser
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
      update("estimatedValue", priceData.bestEstimateIDR.toString());
      const source = form.game === "Pokémon TCG" ? "TCGdex"
        : form.game === "Yu-Gi-Oh!" ? "YGOPRODeck"
        : form.game === "Magic: The Gathering" ? "Scryfall"
        : "database";
      showToast(`✅ Harga real dari ${source}: Rp ${priceData.bestEstimateIDR.toLocaleString("id")}!`, "success");
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
      update("estimatedValue", aiData.value);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      let photoFrontUrl = "";
      let photoBackUrl = "";

      if (photoFrontFile || photoBackFile) {
        setUploadingPhoto(true);
        const uploadPromises = [];
        if (photoFrontFile) {
          uploadPromises.push(
            uploadPhoto(photoFrontFile, `kartulog/${profile.uid}/cards/${Date.now()}_front`)
              .then(url => { photoFrontUrl = url; })
          );
        }
        if (photoBackFile) {
          uploadPromises.push(
            uploadPhoto(photoBackFile, `kartulog/${profile.uid}/cards/${Date.now()}_back`)
              .then(url => { photoBackUrl = url; })
          );
        }
        await Promise.all(uploadPromises);
        setUploadingPhoto(false);
      }

      await addDoc(collection(db, "kartulog_cards"), {
        uid: profile.uid,
        name: form.name.trim(),
        game: form.game,
        expansion: form.expansion.trim(),
        cardNumber: form.cardNumber.trim(),
        rarity: form.rarity,
        condition: form.condition,
        gradingAgency: form.gradingAgency,
        gradeScore: form.gradeScore.trim(),
        slabSerial: form.slabSerial.trim(),
        hpp: parseInt(form.hpp.replace(/\D/g, "")) || 0,
        buyDate: form.buyDate,
        estimatedValue: parseInt(form.estimatedValue.replace(/\D/g, "")) || 0,
        notes: form.notes.trim(),
        isPublic: form.isPublic,
        photoFront: photoFrontUrl,
        photoBack: photoBackUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // ✅ FIX: Pakai setDoc + merge:true supaya tidak error kalau doc belum ada
      await setDoc(doc(db, "koinlog_users", profile.uid), {
        totalItems: increment(1),
        totalHPP: increment(parseInt(form.hpp.replace(/\D/g, "")) || 0),
      }, { merge: true });

      router.push("/dashboard");
    } catch (e: any) {
      console.error("Submit error:", e);
      showToast("Gagal menyimpan kartu: " + e.message, "error");
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
    }
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;background:#060B19;color:#E2E8F0}
        :root{
          --neon-cyan: #00F0FF; --neon-purple: #8A2BE2;
          --navy-surface: #0B132B; --navy-border: #1C2A4A;
          --text-muted: #94A3B8; --r-sm: 8px; --r-md: 12px;
        }
        .nav-top{position:sticky;top:0;z-index:100;background:rgba(6,11,25,.9);backdrop-filter:blur(20px);border-bottom:1px solid var(--navy-border);padding:0 24px;height:64px;display:flex;align-items:center;}
        .btn-back{color:var(--text-muted);text-decoration:none;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;transition:color .2s;}
        .btn-back:hover{color:#fff;}
        .page-body{max-width:800px;margin:0 auto;padding:40px 24px 100px;}
        .page-title{font-family:'Outfit',sans-serif;font-size:32px;font-weight:800;color:#fff;margin-bottom:8px;}
        .page-desc{color:var(--text-muted);margin-bottom:40px;font-size:15px;}
        .form-section{background:var(--navy-surface);border:1px solid var(--navy-border);border-radius:16px;padding:32px;margin-bottom:24px;}
        .section-title{font-size:18px;font-weight:700;color:#fff;margin-bottom:24px;display:flex;align-items:center;gap:10px;}
        .section-title::before{content:'';width:4px;height:20px;background:var(--neon-cyan);border-radius:4px;}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        .form-group{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;}
        .form-group.full{grid-column:1 / -1;}
        .form-label{font-size:13px;font-weight:600;color:var(--text-muted);}
        .form-label span{color:var(--neon-cyan);margin-left:4px;}
        .form-input,.form-select{width:100%;padding:12px 16px;background:rgba(6,11,25,0.5);border:1px solid var(--navy-border);border-radius:var(--r-sm);color:#fff;font-size:14px;font-family:inherit;transition:all .2s;outline:none;}
        .form-input:focus,.form-select:focus{border-color:var(--neon-cyan);box-shadow:0 0 10px rgba(0,240,255,0.1);}
        .form-input::placeholder{color:#4A5568;}
        .form-select{appearance:none;background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right 12px center;background-size:16px;padding-right:40px;}
        .form-select option{background:var(--navy-surface);color:#fff;}
        .ai-btn-wrap{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
        .btn-ai{background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));color:#fff;border:none;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;}
        .btn-ai:disabled{opacity:0.5;cursor:not-allowed;}
        .ai-disclaimer{font-size:11px;color:var(--text-muted);margin-top:5px;display:flex;align-items:flex-start;gap:4px;line-height:1.5;}
        .photo-upload-box{border:2px dashed var(--navy-border);border-radius:var(--r-md);padding:32px 24px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(6,11,25,0.3);position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:220px;}
        .photo-upload-box:hover{border-color:var(--neon-cyan);background:rgba(0,240,255,0.05);}
        .photo-upload-box input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
        .photo-icon{font-size:36px;filter:drop-shadow(0 0 10px rgba(0,240,255,0.3));}
        .photo-label{font-size:14px;font-weight:600;color:#fff;}
        .photo-hint{font-size:12px;color:var(--text-muted);}
        .photo-preview{width:100%;height:100%;object-fit:contain;position:absolute;inset:0;background:#060B19;}
        .btn-remove-photo{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,0.9);border:none;color:#fff;font-size:16px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.5);}
        .form-footer{display:flex;justify-content:flex-end;gap:16px;margin-top:40px;}
        .btn-cancel{padding:14px 28px;border-radius:var(--r-md);background:transparent;border:1px solid var(--navy-border);color:var(--text-muted);font-weight:600;text-decoration:none;transition:all .2s;display:inline-flex;align-items:center;}
        .btn-cancel:hover{color:#fff;border-color:rgba(255,255,255,0.2);}
        .btn-submit{padding:14px 32px;border-radius:var(--r-md);background:linear-gradient(135deg,var(--neon-cyan),var(--neon-purple));color:#fff;font-weight:700;border:none;cursor:pointer;transition:all .2s;}
        .btn-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,240,255,0.3);}
        .btn-submit:disabled{opacity:0.7;cursor:not-allowed;}
        .toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:30px;font-size:14px;font-weight:600;color:#fff;z-index:1000;box-shadow:0 10px 30px rgba(0,0,0,0.5);white-space:nowrap;}
        .toast.success{background:linear-gradient(135deg,#10B981,#059669);}
        .toast.error{background:linear-gradient(135deg,#EF4444,#B91C1C);}
        @media(max-width:600px){.form-grid{grid-template-columns:1fr;}.form-footer{flex-direction:column-reverse;}.btn-cancel,.btn-submit{width:100%;text-align:center;justify-content:center;}}
      `}</style>

      <nav className="nav-top">
        <Link href="/dashboard" className="btn-back">← Kembali ke Brankas</Link>
      </nav>

      <div className="page-body">
        <h1 className="page-title">Simpan Kartu Baru</h1>
        <p className="page-desc">Masukkan detail aset TCG kamu. Biarkan AI membantu menaksir nilainya.</p>

        <form onSubmit={handleSubmit}>

          {/* IDENTITAS KARTU */}
          <div className="form-section">
            <h2 className="section-title">Identitas Kartu</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Game <span>*</span></label>
                <select className="form-select" value={form.game} onChange={e => update("game", e.target.value)} required>
                  <option value="">Pilih TCG</option>
                  {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nama Kartu / Karakter <span>*</span></label>
                <input className="form-input" placeholder="e.g. Charizard ex, Monkey D. Luffy" value={form.name} onChange={e => update("name", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Set / Expansion</label>
                <input className="form-input" placeholder="e.g. 151, Romance Dawn" value={form.expansion} onChange={e => update("expansion", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nomor Kartu</label>
                <input className="form-input" placeholder="e.g. 199/165, OP01-024" value={form.cardNumber} onChange={e => update("cardNumber", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Rarity (Kelangkaan)</label>
                <select className="form-select" value={form.rarity} onChange={e => update("rarity", e.target.value)}>
                  <option value="">Pilih Kelangkaan</option>
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* KONDISI & GRADING */}
          <div className="form-section">
            <h2 className="section-title">Kondisi & Grading</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Kondisi Raw <span>*</span></label>
                <select className="form-select" value={form.condition} onChange={e => update("condition", e.target.value)} required>
                  <option value="">Pilih Kondisi</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Grading Agency</label>
                <select className="form-select" value={form.gradingAgency} onChange={e => update("gradingAgency", e.target.value)}>
                  {GRADING_AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {form.gradingAgency !== "Raw (Ungraded)" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Score (e.g. 10, 9.5)</label>
                    <input className="form-input" value={form.gradeScore} onChange={e => update("gradeScore", e.target.value)} placeholder="e.g. 10, 9.5, 8" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slab Serial Number</label>
                    <input className="form-input" value={form.slabSerial} onChange={e => update("slabSerial", e.target.value)} placeholder="e.g. 12345678" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* FINANSIAL */}
          <div className="form-section">
            <h2 className="section-title">Data Finansial</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Harga Beli / HPP <span>*</span></label>
                <input type="number" className="form-input" placeholder="e.g. 500000" value={form.hpp} onChange={e => update("hpp", e.target.value)} required />
              </div>
              <div className="form-group">
                <div className="ai-btn-wrap">
                  <label className="form-label" style={{ margin: 0 }}>Est. Harga Pasar</label>
                  <button type="button" className="btn-ai" onClick={handleEstimateAI} disabled={estimatingAI}>
                    {estimatingAI ? "⏳ Menganalisa..." : "✨ AI Appraiser"}
                  </button>
                </div>
                <input type="number" className="form-input" placeholder="Isi manual atau klik AI Appraiser" value={form.estimatedValue} onChange={e => update("estimatedValue", e.target.value)} />
                <div className="ai-disclaimer">
                  <span>⚠️</span>
                  <span>Estimasi bersifat indikatif berdasarkan data AI. Verifikasi dengan komunitas atau dealer terpercaya.</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Beli</label>
                <input type="date" className="form-input" value={form.buyDate} onChange={e => update("buyDate", e.target.value)} />
              </div>
              <div className="form-group full">
                <label className="form-label">Catatan Tambahan</label>
                <textarea className="form-input" rows={3} placeholder="Riwayat pembelian, cacat minor, dll..." value={form.notes} onChange={e => update("notes", e.target.value)} style={{ resize: "vertical" }} />
              </div>
              <div className="form-group full" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <input type="checkbox" checked={form.isPublic} onChange={e => update("isPublic", e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--neon-cyan)", flexShrink: 0 }} />
                <label className="form-label" style={{ margin: 0 }}>Tampilkan kartu ini di Portfolio Publik</label>
              </div>
            </div>
          </div>

          {/* FOTO KARTU */}
          <div className="form-section">
            <h2 className="section-title">Dokumentasi Visual</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Foto Depan</label>
                <div className="photo-upload-box">
                  {photoFrontPreview ? (
                    <>
                      <img src={photoFrontPreview} alt="Front" className="photo-preview" />
                      <button type="button" className="btn-remove-photo" onClick={e => { e.preventDefault(); setPhotoFrontFile(null); setPhotoFrontPreview(""); }}>✕</button>
                    </>
                  ) : (
                    <>
                      <div className="photo-icon">🃏</div>
                      <div className="photo-label">Upload Foto Depan</div>
                      <div className="photo-hint">Tap untuk memilih file · Max 5MB</div>
                      <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoSelect("front", e.target.files[0])} />
                    </>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Foto Belakang</label>
                <div className="photo-upload-box">
                  {photoBackPreview ? (
                    <>
                      <img src={photoBackPreview} alt="Back" className="photo-preview" />
                      <button type="button" className="btn-remove-photo" onClick={e => { e.preventDefault(); setPhotoBackFile(null); setPhotoBackPreview(""); }}>✕</button>
                    </>
                  ) : (
                    <>
                      <div className="photo-icon">🔄</div>
                      <div className="photo-label">Upload Foto Belakang</div>
                      <div className="photo-hint">Tap untuk memilih file · Max 5MB</div>
                      <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoSelect("back", e.target.files[0])} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <Link href="/dashboard" className="btn-cancel">Batal</Link>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting
                ? (uploadingPhoto ? "Mengunggah Gambar..." : "Menyimpan ke Brankas...")
                : "Simpan Kartu"}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </>
  );
}