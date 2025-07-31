const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function fetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${BACKEND_URL}${path}`;

  const headers = {
    "Content-Type": "application/json",
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
