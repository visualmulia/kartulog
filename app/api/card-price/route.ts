import { NextRequest, NextResponse } from "next/server";

const USD_TO_IDR = 16200;

// ── POKEMON via TCGdex ────────────────────────────────────────────────
async function fetchPokemonPrice(name: string, setName?: string, cardNumber?: string) {
  const searchRes = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}&pageSize=8`);
  const searchData = await searchRes.json();
  if (!searchData?.length) return null;

  let match = searchData;
  if (setName) {
    const f = searchData.filter((c: any) => c.set?.name?.toLowerCase().includes(setName.toLowerCase()));
    if (f.length) match = f;
  }
  if (cardNumber) {
    const f = match.filter((c: any) => c.localId === cardNumber);
    if (f.length) match = f;
  }

  const detail = await (await fetch(`https://api.tcgdex.net/v2/en/cards/${match[0].id}`)).json();
  const pricing = detail?.pricing;
  const prices: any[] = [];

  if (pricing?.tcgplayer?.normal?.market) prices.push({ type: "Normal", marketIDR: Math.round(pricing.tcgplayer.normal.market * USD_TO_IDR) });
  if (pricing?.tcgplayer?.holofoil?.market) prices.push({ type: "Holofoil", marketIDR: Math.round(pricing.tcgplayer.holofoil.market * USD_TO_IDR) });

  return {
    card: { name: detail.name, set: detail.set?.name, number: detail.localId, image: detail.image ? `${detail.image}/high.webp` : null },
    prices,
    bestEstimateIDR: prices.length ? Math.max(...prices.map((p: any) => p.marketIDR)) : 0,
  };
}

// ── YU-GI-OH via YGOPRODeck ───────────────────────────────────────────
async function fetchYugiohPrice(name: string) {
  const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`);
  const data = await res.json();
  if (!data?.data?.length) return null;

  const card = data.data[0];
  const cardPrices = card.card_prices?.[0];
  const prices: any[] = [];

  if (cardPrices?.tcgplayer_price && parseFloat(cardPrices.tcgplayer_price) > 0) {
    prices.push({ type: "TCGPlayer", marketIDR: Math.round(parseFloat(cardPrices.tcgplayer_price) * USD_TO_IDR) });
  }
  if (cardPrices?.cardmarket_price && parseFloat(cardPrices.cardmarket_price) > 0) {
    prices.push({ type: "Cardmarket", marketIDR: Math.round(parseFloat(cardPrices.cardmarket_price) * 17800) });
  }
  if (cardPrices?.ebay_price && parseFloat(cardPrices.ebay_price) > 0) {
    prices.push({ type: "eBay", marketIDR: Math.round(parseFloat(cardPrices.ebay_price) * USD_TO_IDR) });
  }

  return {
    card: { name: card.name, set: card.card_sets?.[0]?.set_name, image: card.card_images?.[0]?.image_url_small },
    prices,
    bestEstimateIDR: prices.length ? Math.max(...prices.map((p: any) => p.marketIDR)) : 0,
  };
}

// ── MAGIC: THE GATHERING via Scryfall ────────────────────────────────
async function fetchMTGPrice(name: string, setName?: string) {
  let url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`;
  if (setName) url += `&set=${encodeURIComponent(setName)}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const card = await res.json();
  if (card.object === "error") return null;

  const prices: any[] = [];
  if (card.prices?.usd) prices.push({ type: "Normal", marketIDR: Math.round(parseFloat(card.prices.usd) * USD_TO_IDR) });
  if (card.prices?.usd_foil) prices.push({ type: "Foil", marketIDR: Math.round(parseFloat(card.prices.usd_foil) * USD_TO_IDR) });

  return {
    card: { name: card.name, set: card.set_name, number: card.collector_number, image: card.image_uris?.small },
    prices,
    bestEstimateIDR: prices.length ? Math.max(...prices.map((p: any) => p.marketIDR)) : 0,
  };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { name, game, setName, cardNumber } = await req.json();
  if (!name || !game) return NextResponse.json({ error: "Nama dan game wajib diisi" }, { status: 400 });

  try {
    let result = null;

    if (game === "Pokémon TCG") {
      result = await fetchPokemonPrice(name, setName, cardNumber);
    } else if (game === "Yu-Gi-Oh!") {
      result = await fetchYugiohPrice(name);
    } else if (game === "Magic: The Gathering") {
      result = await fetchMTGPrice(name, setName);
    }

    if (result && result.bestEstimateIDR > 0) {
      return NextResponse.json({ found: true, ...result });
    }

    return NextResponse.json({ found: false, message: "Harga tidak ditemukan di database" });

  } catch (e) {
    console.error("Card price error:", e);
    return NextResponse.json({ found: false, message: "Gagal mengambil data" });
  }
}