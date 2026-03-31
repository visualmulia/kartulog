import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, setName, cardNumber } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Nama kartu wajib diisi" }, { status: 400 });
  }

  try {
    const USD_TO_IDR = 16200;

    // Cari kartu by nama
    const searchUrl = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}&pageSize=8`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData || searchData.length === 0) {
      return NextResponse.json({ found: false, message: "Kartu tidak ditemukan" });
    }

    // Filter by set kalau ada
    let matchedCards = searchData;
    if (setName) {
      const filtered = searchData.filter((c: any) =>
        c.set?.name?.toLowerCase().includes(setName.toLowerCase()) ||
        c.set?.id?.toLowerCase().includes(setName.toLowerCase())
      );
      if (filtered.length > 0) matchedCards = filtered;
    }

    // Filter by card number kalau ada
    if (cardNumber) {
      const filtered = matchedCards.filter((c: any) =>
        c.localId === cardNumber || c.localId?.includes(cardNumber)
      );
      if (filtered.length > 0) matchedCards = filtered;
    }

    const bestMatch = matchedCards[0];

    // Ambil detail lengkap kartu termasuk harga
    const detailRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${bestMatch.id}`);
    const detail = await detailRes.json();

    // Ambil harga dari field pricing
    const pricing = detail?.pricing;
    const priceList: { type: string; marketIDR: number; marketUSD: number }[] = [];

    if (pricing) {
      if (pricing.tcgplayer) {
        const p = pricing.tcgplayer;
        if (p.normal?.market) priceList.push({ type: "Normal", marketIDR: Math.round(p.normal.market * USD_TO_IDR), marketUSD: p.normal.market });
        if (p.holofoil?.market) priceList.push({ type: "Holofoil", marketIDR: Math.round(p.holofoil.market * USD_TO_IDR), marketUSD: p.holofoil.market });
        if (p.reverseHolofoil?.market) priceList.push({ type: "Reverse Holo", marketIDR: Math.round(p.reverseHolofoil.market * USD_TO_IDR), marketUSD: p.reverseHolofoil.market });
      }
      if (pricing.cardmarket) {
        const p = pricing.cardmarket;
        if (p.averageSellPrice) priceList.push({ type: "Cardmarket (EU)", marketIDR: Math.round(p.averageSellPrice * 17800), marketUSD: p.averageSellPrice });
      }
    }

    return NextResponse.json({
      found: true,
      card: {
        id: detail.id,
        name: detail.name,
        set: detail.set?.name,
        number: detail.localId,
        rarity: detail.rarity,
        image: detail.image ? `${detail.image}/high.webp` : null,
      },
      prices: priceList,
      bestEstimateIDR: priceList.length > 0
        ? Math.max(...priceList.map(p => p.marketIDR))
        : 0,
    });

  } catch (error: any) {
    console.error("TCGdex API error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}