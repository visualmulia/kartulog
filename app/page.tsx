import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
          background-color: #060B19; /* DEEP DARK NAVY - Sangat mewah */
          color: #E2E8F0; 
          overflow-x: hidden;
        }
        
        :root {
          --holographic-1: #00F0FF; /* Neon Cyan */
          --holographic-2: #8A2BE2; /* Blue Violet */
          --holographic-3: #FF0055; /* Neon Pink */
          --navy-surface: #0B132B;  /* Card surface */
          --navy-border: #1C2A4A;   /* Border color */
          --text-muted: #94A3B8;
        }

        /* --- NAVIGASI --- */
        .navbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(6, 11, 25, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--navy-border);
          padding: 16px 40px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .logo-wrap { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: linear-gradient(135deg, var(--holographic-2), var(--holographic-1));
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 18px; color: #fff;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }
        .logo-text { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
        .nav-links { display: flex; gap: 32px; font-size: 14px; font-weight: 500; color: var(--text-muted); }
        .nav-links span { cursor: pointer; transition: color 0.2s; }
        .nav-links span:hover { color: #fff; }
        
        .btn-login {
          padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
          background: #fff; color: #060B19; text-decoration: none; transition: all 0.2s;
        }
        .btn-login:hover { background: var(--holographic-1); box-shadow: 0 0 15px rgba(0,240,255,0.4); }

        /* --- HERO SECTION --- */
        .hero {
          padding: 180px 40px 120px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
          max-width: 1280px; margin: 0 auto; align-items: center;
          position: relative;
        }
        .hero::before {
          content: ''; position: absolute; top: -10%; left: -10%;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(6,11,25,0) 70%);
          z-index: -1; pointer-events: none;
        }
        
        .eyebrow { font-size: 13px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
        .eyebrow::before { content: ''; width: 40px; height: 2px; background: var(--holographic-1); }
        
        .hero-title { font-family: 'Outfit', sans-serif; font-size: 64px; font-weight: 800; line-height: 1.1; margin-bottom: 24px; letter-spacing: -0.03em; color: #fff; }
        .text-gradient { background: linear-gradient(135deg, var(--holographic-1), var(--holographic-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-desc { font-size: 18px; color: var(--text-muted); margin-bottom: 40px; line-height: 1.6; max-width: 500px; }
        
        .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 16px 36px; border-radius: 12px; background: linear-gradient(135deg, var(--holographic-2), var(--holographic-1)); color: #fff; font-size: 16px; font-weight: 700; text-decoration: none; box-shadow: 0 8px 24px rgba(0, 240, 255, 0.25); transition: all 0.3s; gap: 10px; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0, 240, 255, 0.4); }
        .btn-secondary { display: inline-flex; align-items: center; justify-content: center; padding: 16px 36px; border-radius: 12px; background: var(--navy-surface); border: 1px solid var(--navy-border); color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; margin-left: 16px; transition: all 0.2s; }
        .btn-secondary:hover { background: #111D3E; }

        .hero-image-placeholder { width: 100%; height: 500px; background: var(--navy-surface); border: 1px solid var(--navy-border); border-radius: 24px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
        .hero-image-placeholder::after { content: 'Preview App / Mockup Kartu Disini'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--navy-border); font-weight: 700; }

        /* --- LOGO STRIP (Supported Games) --- */
        .games-strip { padding: 40px 24px; border-top: 1px solid var(--navy-border); border-bottom: 1px solid var(--navy-border); background: rgba(11, 19, 43, 0.5); text-align: center; }
        .games-list { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; opacity: 0.6; font-family: 'Outfit', sans-serif; }
        .game-item { font-weight: 800; font-size: 18px; letter-spacing: 0.05em; }

        /* --- FEATURES SECTION (Meniru KoinLog) --- */
        .section-features { padding: 120px 40px; max-width: 1280px; margin: 0 auto; }
        .section-header { margin-bottom: 64px; }
        .section-title { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 800; color: #fff; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 16px; }
        .section-desc { font-size: 18px; color: var(--text-muted); max-width: 600px; line-height: 1.6; }

        .feat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .feat-card { background: var(--navy-surface); border: 1px solid var(--navy-border); border-radius: 20px; padding: 40px; transition: all 0.3s; position: relative; overflow: hidden; }
        .feat-card:hover { border-color: rgba(0, 240, 255, 0.3); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .feat-icon-wrap { width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 24px; color: var(--holographic-1); }
        .feat-title { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #fff; }
        .feat-desc { font-size: 15px; color: var(--text-muted); line-height: 1.6; }

        /* --- HOW IT WORKS (Tiga Langkah) --- */
        .section-steps { padding: 120px 40px; background: linear-gradient(to bottom, var(--navy-surface), #060B19); border-top: 1px solid var(--navy-border); }
        .steps-container { max-width: 1280px; margin: 0 auto; }
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 64px; }
        .step-card { padding: 32px; background: rgba(6, 11, 25, 0.6); border: 1px solid var(--navy-border); border-radius: 16px; }
        .step-num { width: 40px; height: 40px; border-radius: 8px; background: var(--holographic-2); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; margin-bottom: 24px; box-shadow: 0 0 15px rgba(138,43,226,0.4); }
        .step-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 12px; }
        .step-desc { font-size: 14px; color: var(--text-muted); line-height: 1.6; }

        /* --- CTA FOOTER --- */
        .cta-section { padding: 120px 24px; text-align: center; }
        .cta-title { font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 800; color: #fff; margin-bottom: 24px; }
        .cta-desc { font-size: 18px; color: var(--text-muted); max-width: 500px; margin: 0 auto 40px; }
        
        .footer { padding: 40px 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--navy-border); font-size: 13px; color: var(--text-muted); }

        @media(max-width: 900px) {
          .hero { grid-template-columns: 1fr; padding-top: 140px; text-align: center; }
          .eyebrow { justify-content: center; }
          .eyebrow::before { display: none; }
          .hero-desc { margin: 0 auto 40px; }
          .btn-secondary { margin-left: 0; margin-top: 16px; display: flex; }
          .feat-grid, .steps-grid { grid-template-columns: 1fr; }
          .nav-links { display: none; }
        }
      `}</style>

      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="logo-wrap">
          <div className="logo-icon">K</div>
          <div className="logo-text">KartuLog</div>
        </Link>
        <div className="nav-links">
          <span>Fitur</span>
          <span>Game Support</span>
          <span>Portfolio Publik</span>
        </div>
        <Link href="/login" className="btn-login">Masuk / Daftar</Link>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div>
          <div className="eyebrow">Platform TCG Vault Indonesia</div>
          <h1 className="hero-title">
            Catat. Kelola. <br/> <span className="text-gradient">Pamerkan Deckmu.</span>
          </h1>
          <p className="hero-desc">
            KartuLog adalah brankas digital premium untuk kolektor TCG. Simpan data kartu, pantau valuasi AI, dan buat galeri pameran untuk koleksi legendarismu.
          </p>
          <div>
            <Link href="/login" className="btn-primary">Mulai Koleksi — Gratis</Link>
            <Link href="/p/demo" className="btn-secondary">Lihat Contoh Portfolio</Link>
          </div>
        </div>
        <div className="hero-image-placeholder">
          {/* Nanti diisi mockup gambar aplikasi */}
        </div>
      </section>

      {/* Games Strip */}
      <section className="games-strip">
        <div className="games-list">
          <span className="game-item">POKÉMON TCG</span>
          <span className="game-item">ONE PIECE CARD GAME</span>
          <span className="game-item">YU-GI-OH!</span>
          <span className="game-item">MAGIC: THE GATHERING</span>
        </div>
      </section>

      {/* Features Section (Copywriting ala KoinLog) */}
      <section className="section-features">
        <div className="section-header">
          <div className="eyebrow" style={{justifyContent: 'flex-start', margin: 0, paddingBottom: 16}}>Fitur Unggulan</div>
          <h2 className="section-title">Semua yang dibutuhkan<br/>kolektor kartu serius.</h2>
          <p className="section-desc">Dibangun khusus untuk memenuhi standar pencatatan para TCG player dan kolektor elit.</p>
        </div>

        <div className="feat-grid">
          <div className="feat-card">
            <div className="feat-icon-wrap">📋</div>
            <h3 className="feat-title">Pencatatan Detail & Terstruktur</h3>
            <p className="feat-desc">Input data spesifik kartu: Expansion, Set, Rarity, hingga Grade (PSA/BGS/CGC) lengkap dengan nomor seri slab-nya.</p>
          </div>
          <div className="feat-card">
            <div className="feat-icon-wrap">🤖</div>
            <h3 className="feat-title">Estimasi Harga AI</h3>
            <p className="feat-desc">Tidak perlu lagi repot riset harga pasar. Biarkan teknologi AI kami menaksir nilai kartu Anda secara real-time.</p>
          </div>
          <div className="feat-card">
            <div className="feat-icon-wrap">🔗</div>
            <h3 className="feat-title">Portfolio Publik (Link in Bio)</h3>
            <p className="feat-desc">Dapatkan link eksklusif (kartulog.com/p/namakamu) untuk memamerkan koleksi terbaikmu ke komunitas atau calon pembeli.</p>
          </div>
          <div className="feat-card">
            <div className="feat-icon-wrap">📊</div>
            <h3 className="feat-title">Dashboard Analitik</h3>
            <p className="feat-desc">Pantau total aset (HPP), persentase keuntungan, dan persebaran koleksimu dalam satu layar dashboard yang sangat elegan.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-steps">
        <div className="steps-container">
          <div className="eyebrow" style={{justifyContent: 'flex-start', margin: 0, paddingBottom: 16}}>Cara Kerja</div>
          <h2 className="section-title">Tiga langkah, koleksimu<br/><span style={{color: 'var(--holographic-2)'}}>online selamanya.</span></h2>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <h3 className="step-title">Daftar gratis dengan Google</h3>
              <p className="step-desc">Login instan tanpa perlu repot bikin password baru. Data koleksimu aman dan tersinkronisasi di cloud.</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <h3 className="step-title">Input Kartu Andalanmu</h3>
              <p className="step-desc">Masukkan detail kartu, unggah foto depan & belakang, lalu biarkan AI menghitung estimasi harga pasarnya saat ini.</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <h3 className="step-title">Bagikan ke Komunitas</h3>
              <p className="step-desc">Gunakan URL portfolio publikmu untuk dibagikan di grup Discord, Facebook, atau pajang di bio Instagram.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2 className="cta-title">Siap merapikan<br/>koleksi kartumu?</h2>
        <p className="cta-desc">Bergabunglah dengan ratusan kolektor Indonesia lainnya yang sudah memodernisasi cara mereka mengelola aset TCG.</p>
        <Link href="/login" className="btn-primary" style={{padding: '18px 48px', fontSize: '18px'}}>
          Buat Akun — Gratis
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="logo-wrap" style={{gap: '8px'}}>
          <div className="logo-icon" style={{width: 24, height: 24, fontSize: 12}}>K</div>
          <span style={{color: '#fff', fontWeight: 700}}>KartuLog</span>
        </div>
        <div>
          © {new Date().getFullYear()} KartuLog. Hak cipta dilindungi.
        </div>
        <div style={{display: 'flex', gap: '20px'}}>
          <span>Syarat Ketentuan</span>
          <span>Privasi</span>
        </div>
      </footer>
    </>
  );
}