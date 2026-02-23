// ./scripts/migrate-media.mjs
//
// Migrates media files from old Strapi v3 (Cloudinary) to new Strapi v5 (Strapi Cloud).
// Handles: spectacles (image, gallery, dossier_de_diffusion) and podcasts (image).
//
// Usage:
//   DRY_RUN=1 node scripts/migrate-media.mjs          # Preview only, no changes
//   STRAPI_API_TOKEN=xxx node scripts/migrate-media.mjs  # Actually migrate

const DRY_RUN = process.env.DRY_RUN === '1';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const V3_BASE = 'https://ciefact.herokuapp.com';
const V5_BASE = 'https://fearless-boot-f25ab4f58d.strapiapp.com';

if (!STRAPI_API_TOKEN) {
  console.error('STRAPI_API_TOKEN is required. Set it as an environment variable.');
  process.exit(1);
}

if (DRY_RUN) {
  console.log('=== DRY RUN MODE — no changes will be made ===\n');
}

// --- Helpers ---

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function uploadToStrapi(fileBuffer, fileName, mimeType) {
  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would upload: ${fileName} (${mimeType})`);
    return { id: 'dry-run-id' };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const blob = new Blob([fileBuffer], { type: mimeType });
    const form = new FormData();
    form.append('files', blob, fileName);

    const res = await fetch(`${V5_BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      if (attempt < 2) {
        console.log(`    Retry upload ${attempt + 1}/3 for ${fileName} (HTTP ${res.status})`);
        await delay(3000 * (attempt + 1));
        continue;
      }
      throw new Error(`Upload failed for ${fileName}: ${res.status} ${text.slice(0, 200)}`);
    }

    const result = await res.json();
    return result[0];
  }
}

async function updateEntry(contentType, documentId, data) {
  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would update ${contentType} ${documentId}`);
    return;
  }

  const res = await fetch(`${V5_BASE}/api/${contentType}/${documentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update failed for ${contentType}/${documentId}: ${res.status} ${text}`);
  }

  return res.json();
}

async function fetchV3(endpoint) {
  const res = await fetch(`${V3_BASE}/${endpoint}?_limit=100`);
  if (!res.ok) throw new Error(`V3 fetch failed: ${endpoint} ${res.status}`);
  return res.json();
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      if (i < retries - 1) {
        console.log(`    Retry ${i + 1}/${retries} for ${url.split('?')[0]} (HTTP ${res.status})`);
        await delay(2000 * (i + 1));
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (i < retries - 1) {
        console.log(`    Retry ${i + 1}/${retries} — got non-JSON response`);
        await delay(2000 * (i + 1));
        continue;
      }
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }
  }
}

async function fetchV5AllPages(endpoint) {
  let page = 1;
  let all = [];
  while (true) {
    const url = `${V5_BASE}/api/${endpoint}?pagination%5Bpage%5D=${page}&pagination%5BpageSize%5D=100&populate=*`;
    const json = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } });
    if (!json.data) break;
    all = all.concat(json.data);
    if (page >= json.meta.pagination.pageCount) break;
    page++;
  }
  return all;
}

// --- Migration logic ---

async function migrateMediaFile(mediaObj) {
  const url = mediaObj.url;
  const fileName = mediaObj.name || url.split('/').pop();
  const mimeType = mediaObj.mime || 'application/octet-stream';

  console.log(`    Downloading: ${fileName}`);
  const buffer = await downloadFile(url);
  console.log(`    Uploading: ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)`);
  const uploaded = await uploadToStrapi(buffer, fileName, mimeType);
  await delay(500); // Rate limiting
  return uploaded;
}

async function migrateSpectacles() {
  console.log('\n========== SPECTACLES ==========\n');

  const v3Spectacles = await fetchV3('spectacles');
  const v5Spectacles = await fetchV5AllPages('spectacles');

  console.log(`V3: ${v3Spectacles.length} spectacles, V5: ${v5Spectacles.length} spectacles\n`);

  // Build v5 lookup by slug
  const v5BySlug = {};
  for (const s of v5Spectacles) {
    v5BySlug[s.slug] = s;
  }

  let stats = { image: 0, gallery: 0, pdf: 0, skipped: 0, errors: 0 };

  for (const v3 of v3Spectacles) {
    const v5 = v5BySlug[v3.slug];
    if (!v5) {
      console.log(`  SKIP: "${v3.slug}" — not found in v5`);
      stats.skipped++;
      continue;
    }

    console.log(`\n  --- ${v3.slug} (v5 documentId: ${v5.documentId}) ---`);
    const updateData = {};

    try {
      // 1. Image (single)
      const v5HasImage = v5.image !== null && v5.image !== undefined;
      if (v3.image && !v5HasImage) {
        console.log(`  [image] Missing in v5, migrating...`);
        const uploaded = await migrateMediaFile(v3.image);
        updateData.image = uploaded.id;
        stats.image++;
      } else if (v5HasImage) {
        console.log(`  [image] Already present, skipping`);
      }

      // 2. Gallery (multiple) — compare counts and complete partial galleries
      const v5Gallery = Array.isArray(v5.gallery) ? v5.gallery : [];
      const v3Gallery = Array.isArray(v3.galery) ? v3.galery : [];
      if (v3Gallery.length > 0 && v5Gallery.length < v3Gallery.length) {
        // Find v3 items not yet in v5 by comparing filenames
        const v5Names = new Set(v5Gallery.map(g => g.name));
        const missing = v3Gallery.filter(item => {
          const name = item.name || item.url.split('/').pop();
          return !v5Names.has(name);
        });
        if (missing.length > 0) {
          console.log(`  [gallery] v5 has ${v5Gallery.length}/${v3Gallery.length}, migrating ${missing.length} missing items...`);
          const existingIds = v5Gallery.map(g => g.id);
          const uploadedIds = [];
          for (const item of missing) {
            try {
              const uploaded = await migrateMediaFile(item);
              uploadedIds.push(uploaded.id);
              stats.gallery++;
            } catch (err) {
              console.error(`    ERROR uploading gallery item: ${err.message}`);
              stats.errors++;
            }
          }
          if (uploadedIds.length > 0) {
            updateData.gallery = [...existingIds, ...uploadedIds];
          }
        } else {
          console.log(`  [gallery] ${v5Gallery.length}/${v3Gallery.length} — all names match, skipping`);
        }
      } else if (v5Gallery.length >= v3Gallery.length && v3Gallery.length > 0) {
        console.log(`  [gallery] Already has ${v5Gallery.length} items (v3: ${v3Gallery.length}), skipping`);
      } else {
        console.log(`  [gallery] Empty in v3 too`);
      }

      // 3. PDF / dossier_de_diffusion (single or multiple in v3 → single in v5)
      const v5HasPdf = v5.dossier_de_diffusion !== null && v5.dossier_de_diffusion !== undefined;
      const v3Pdf = Array.isArray(v3.pdf) ? v3.pdf[0] : v3.pdf;
      if (v3Pdf && !v5HasPdf) {
        console.log(`  [dossier_de_diffusion] Missing in v5, migrating...`);
        const uploaded = await migrateMediaFile(v3Pdf);
        updateData.dossier_de_diffusion = uploaded.id;
        stats.pdf++;
      } else if (v5HasPdf) {
        console.log(`  [dossier_de_diffusion] Already present, skipping`);
      }

      // Apply updates
      if (Object.keys(updateData).length > 0) {
        console.log(`  => Updating entry with fields: ${Object.keys(updateData).join(', ')}`);
        await updateEntry('spectacles', v5.documentId, updateData);
        console.log(`  => Done`);
      } else {
        console.log(`  => Nothing to update`);
      }

    } catch (err) {
      console.error(`  ERROR processing ${v3.slug}: ${err.message}`);
      stats.errors++;
    }
  }

  console.log(`\n  Spectacles stats: ${stats.image} images, ${stats.gallery} gallery items, ${stats.pdf} PDFs migrated, ${stats.skipped} skipped, ${stats.errors} errors`);
}

async function migratePodcasts() {
  console.log('\n========== PODCASTS ==========\n');

  const v3Podcasts = await fetchV3('podcasts');
  const v5Podcasts = await fetchV5AllPages('podcasts');

  console.log(`V3: ${v3Podcasts.length} podcasts, V5: ${v5Podcasts.length} podcasts\n`);

  // Match by title (normalize for comparison)
  function normalize(title) {
    return (title || '').replace(/<<|>>/g, '').trim().toLowerCase();
  }

  const v5ByTitle = {};
  for (const p of v5Podcasts) {
    v5ByTitle[normalize(p.title)] = p;
  }

  let stats = { image: 0, skipped: 0, errors: 0 };

  for (const v3 of v3Podcasts) {
    const v5 = v5ByTitle[normalize(v3.title)];
    if (!v5) {
      console.log(`  SKIP: "${v3.title}" — not found in v5`);
      stats.skipped++;
      continue;
    }

    console.log(`\n  --- ${v3.title} (v5 documentId: ${v5.documentId}) ---`);

    try {
      const v5HasImage = v5.image !== null && v5.image !== undefined;
      if (v3.image && !v5HasImage) {
        console.log(`  [image] Missing in v5, migrating...`);
        const uploaded = await migrateMediaFile(v3.image);
        await updateEntry('podcasts', v5.documentId, { image: uploaded.id });
        console.log(`  => Done`);
        stats.image++;
      } else if (v5HasImage) {
        console.log(`  [image] Already present, skipping`);
      }
    } catch (err) {
      console.error(`  ERROR processing podcast: ${err.message}`);
      stats.errors++;
    }
  }

  console.log(`\n  Podcasts stats: ${stats.image} images migrated, ${stats.skipped} skipped, ${stats.errors} errors`);
}

// --- Main ---

async function main() {
  console.log('Media Migration: Strapi v3 (Cloudinary) → Strapi v5 (Strapi Cloud)');
  console.log(`V3: ${V3_BASE}`);
  console.log(`V5: ${V5_BASE}`);
  console.log('');

  await migrateSpectacles();
  await migratePodcasts();

  console.log('\n========== MIGRATION COMPLETE ==========');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
