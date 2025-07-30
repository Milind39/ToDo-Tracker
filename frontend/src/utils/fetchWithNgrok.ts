const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchWithNgrok(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${BACKEND_URL}${path}`;

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true", // ✅ Important to bypass ngrok warning
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    const text = await response.text();
    throw new Error(`Expected JSON but got:\n${text}`);
  }
}
