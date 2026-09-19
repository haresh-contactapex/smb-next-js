import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

// maxAgeSeconds omitted => a browser-session cookie (cleared when the browser closes),
// used for "keep me signed in" toggles that are left unchecked.
export async function setAuthCookie(name, token, { maxAgeSeconds } = {}) {
  const cookieStore = await cookies();
  cookieStore.set(name, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
  });
}

export async function getAuthCookie(name) {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value ?? null;
}

export async function clearAuthCookie(name) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}
