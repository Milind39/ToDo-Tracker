// lib/fetcher.ts
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const text = await res.text();

    try {
      return JSON.parse(text) as T;
    } catch (jsonErr) {
      console.error("❌ JSON parse error:", jsonErr);
      console.error("🧾 Invalid response:", text);
      return null;
    }
  } catch (err) {
    console.error("❌ Fetch failed:", err);
    return null;
  }
}
