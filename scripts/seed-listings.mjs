#!/usr/bin/env node
/**
 * Seed listings into Firestore + Storage via firebase-admin.
 *
 * Usage:
 *   set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   set SEED_OWNER_ID=<firebase-auth-uid>
 *   set FIREBASE_STORAGE_BUCKET=<project-id.appspot.com>
 *   npm run seed:listings -- scripts/seed-data/listings.example.json
 */

import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function usage() {
  console.log(`
Usage:
  GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \\
  SEED_OWNER_ID=<uid> FIREBASE_STORAGE_BUCKET=<bucket> \\
    npm run seed:listings -- scripts/seed-data/listings.example.json

JSON item fields:
  title (required), wilaya (required), images (array of local paths, required)
  brand?, model?, year?, condition?, size?, quantity?, description?, commune?,
  ownerName?, ownerPhone?, ownerEmail?
`);
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function parseSize(size) {
  const raw = (size || "205/55 R16").trim();
  const [wp = "205/55", dia = "16"] = raw.split(" R");
  const [width = "205", profile = "55"] = wp.split("/");
  return { size: raw, width, profile, diameter: dia };
}

async function main() {
  const jsonPathArg = process.argv[2] || "scripts/seed-data/listings.example.json";
  const jsonPath = path.isAbsolute(jsonPathArg) ? jsonPathArg : path.resolve(root, jsonPathArg);
  const ownerId = process.env.SEED_OWNER_ID;

  if (!ownerId) {
    console.error("Missing SEED_OWNER_ID (Firebase Auth UID of the seller).");
    usage();
    process.exit(1);
  }

  if (!(await fileExists(jsonPath))) {
    console.error(`JSON file not found: ${jsonPath}`);
    usage();
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        undefined,
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const raw = JSON.parse(await readFile(jsonPath, "utf8"));
  const items = Array.isArray(raw) ? raw : raw.listings;
  if (!Array.isArray(items) || items.length === 0) {
    console.error("JSON must be an array of listings or { listings: [...] }");
    process.exit(1);
  }

  console.log(`Seeding ${items.length} listing(s) for owner ${ownerId}...`);
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item.title || `#${i + 1}`;
    try {
      if (!item.title || String(item.title).trim().length < 10) {
        throw new Error("title must be at least 10 characters");
      }
      if (!item.wilaya) throw new Error("wilaya is required");
      const imagePaths = item.images || [];
      if (!imagePaths.length) throw new Error("at least one image path is required");

      const { size, width, profile, diameter } = parseSize(item.size);
      const docRef = db.collection("listings").doc();
      const listingId = docRef.id;

      const imageUrls = [];
      for (let j = 0; j < imagePaths.length; j++) {
        const imgRel = imagePaths[j];
        const imgPath = path.isAbsolute(imgRel) ? imgRel : path.resolve(path.dirname(jsonPath), imgRel);
        if (!(await fileExists(imgPath))) {
          throw new Error(`image not found: ${imgPath}`);
        }
        const ext = path.extname(imgPath) || ".jpg";
        const dest = `listings/${ownerId}/${listingId}/images/img_${j + 1}_${Date.now()}${ext}`;
        const [uploaded] = await bucket.upload(imgPath, {
          destination: dest,
          metadata: {
            contentType: ext === ".png" ? "image/png" : "image/jpeg",
            metadata: {
              uploadedBy: ownerId,
              listingId,
              fileType: "listing-image",
            },
          },
        });
        await uploaded.makePublic().catch(() => undefined);
        const publicUrl =
          `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(dest).replace(/%2F/g, "/")}`;
        // Prefer signed-free download URL via token if available
        const [meta] = await uploaded.getMetadata();
        const token = meta.metadata?.firebaseStorageDownloadTokens;
        if (token) {
          imageUrls.push(
            `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`,
          );
        } else {
          // Ensure download token
          const newToken = cryptoRandom();
          await uploaded.setMetadata({
            metadata: {
              ...(meta.metadata || {}),
              firebaseStorageDownloadTokens: newToken,
            },
          });
          imageUrls.push(
            `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${newToken}`,
          );
        }
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const payload = {
        ownerId,
        sellerId: ownerId,
        ownerName: item.ownerName || "بائع تجريبي",
        ownerPhone: item.ownerPhone || "",
        ownerEmail: item.ownerEmail || "",
        title: String(item.title).trim(),
        category: "tire",
        brand: item.brand || "غير محدد",
        model: item.model || "—",
        year: item.year ? Number(item.year) : 0,
        condition: item.condition || "used",
        price: 0,
        description: item.description || "",
        size,
        width,
        profile,
        diameter,
        wheelType: "tire",
        isNegotiable: false,
        quantity: item.quantity ? Number(item.quantity) : 4,
        wilaya: item.wilaya,
        commune: item.commune || "—",
        imageUrls,
        images: imageUrls,
        coverImageUrl: imageUrls[0] || "",
        status: "active",
        visibility: "public",
        isPromoted: false,
        featured: false,
        views: 0,
        contactClicks: 0,
        favorites: 0,
        shareCount: 0,
        tags: [],
        features: [],
        warranty: { hasWarranty: false },
        keywords: [],
        createdAt: now,
        publishedAt: now,
        updatedAt: now,
      };

      await docRef.set(payload);
      results.push({ ok: true, id: listingId, title: label });
      console.log(`✓ ${label} → ${listingId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ ok: false, title: label, error: message });
      console.error(`✗ ${label}: ${message}`);
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log(`\nDone. Success: ${ok}, Failed: ${fail}`);
  if (fail > 0) process.exitCode = 1;
}

function cryptoRandom() {
  return [...Array(20)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
