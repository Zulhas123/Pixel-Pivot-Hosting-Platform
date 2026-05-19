import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type SessionTokenPayload = {
  sub: string;
  role: "CUSTOMER" | "ADMIN" | "SUPPORT";
  username: string;
  name: string;
  email?: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return encoder.encode(secret);
}

export async function signSessionToken(payload: SessionTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as unknown as SessionTokenPayload & { exp: number; iat: number };
}
