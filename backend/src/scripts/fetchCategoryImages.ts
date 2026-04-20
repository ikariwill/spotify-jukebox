import * as fs from 'fs'
import * as path from 'path'

const CATEGORIES: { id: string; name: string; artistQuery: string }[] = [
  { id: "pop", name: "Pop", artistQuery: "Taylor Swift" },
  { id: "rock", name: "Rock", artistQuery: "Foo Fighters" },
  { id: "hip-hop", name: "Hip-Hop", artistQuery: "Kendrick Lamar" },
  { id: "electronic", name: "Electronic", artistQuery: "Daft Punk" },
  { id: "r-b", name: "R&B", artistQuery: "The Weeknd" },
  { id: "latin", name: "Latin", artistQuery: "Bad Bunny" },
  { id: "indie", name: "Indie", artistQuery: "Arctic Monkeys" },
  { id: "jazz", name: "Jazz", artistQuery: "Miles Davis" },
  { id: "classical", name: "Classical", artistQuery: "Ludwig van Beethoven" },
  { id: "metal", name: "Metal", artistQuery: "Metallica" },
  { id: "reggae", name: "Reggae", artistQuery: "Bob Marley" },
  { id: "country", name: "Country", artistQuery: "Johnny Cash" },
  { id: "blues", name: "Blues", artistQuery: "B.B. King" },
  { id: "soul", name: "Soul", artistQuery: "Aretha Franklin" },
  { id: "funk", name: "Funk", artistQuery: "Anitta" },
  { id: "punk", name: "Punk", artistQuery: "The Clash" },
  { id: "sertanejo", name: "Sertanejo", artistQuery: "Jorge e Mateus" },
  { id: "pagode", name: "Pagode", artistQuery: "Thiaguinho" },
  { id: "samba", name: "Samba", artistQuery: "Grupo Revelação" },
  { id: "mpb", name: "MPB", artistQuery: "Caetano Veloso" },
];

async function getToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as any;
  return data.access_token;
}

async function fetchGenreImage(
  cat: { id: string; artistQuery?: string },
  token: string,
): Promise<string> {
  const q = cat.artistQuery ?? cat.id;
  const params = new URLSearchParams({ q, type: "artist", limit: "1" });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as any;
  return data.artists?.items?.[0]?.images?.[0]?.url ?? "";
}

async function main() {
  const token = await getToken();
  const results: { id: string; name: string; imageUrl: string }[] = [];

  for (const cat of CATEGORIES) {
    const imageUrl = await fetchGenreImage(cat, token);
    console.log(`${cat.name}: ${imageUrl ? "✓" : "✗ (no image)"}`);
    results.push({ id: cat.id, name: cat.name, imageUrl });
    await new Promise((r) => setTimeout(r, 200));
  }

  const outPath = path.join(__dirname, "../data/categoryImages.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outPath}`);
}

main().catch(console.error);
