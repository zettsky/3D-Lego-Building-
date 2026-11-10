# Data sources and licensing

Researched 2026-11-10 by the `lego-data-engineer` session. Pages were read with a normal HTTP client that
identifies itself (`tsumiki-data-pipeline/0.1`). Nothing here bypasses a bot check, login wall or rate limit.
Where a page was blocked the fact is marked **unverified**, and nothing was filled in from memory.

This is not legal advice. Items marked **⚠ owner decision** need the project owner's call before the related code
path is switched on.

> Tsumiki is an independent fan project. LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize
> or endorse this project. LDraw™ is a trademark owned and licensed by the Estate of James Jessiman.

## Summary

| Source | What we use | Access | Decision | Status in code |
| --- | --- | --- | --- | --- |
| LEGO official instructions | Reference to the PDF (URL, booklet, size) | Public web page; no API | **Reference only.** Never download or store PDFs automatically. | `manual` discovery adapter stores references a person adds. No lego.com fetcher. |
| Brickset API v3 | Instruction references per set | API key (owner must request) | **API, reference only**, once key + terms are confirmed | Adapter written, disabled without `BRICKSET_API_KEY`. ⚠ |
| Rebrickable bulk CSVs | Themes, colours, parts, elements, sets, minifigs, inventories | Public CDN files, conditional GET | **Download** into the DB with attribution. Do not republish the dumps. | Implemented, verified on the live files. ⚠ terms page unread |
| Rebrickable API v3 | Part external IDs (LDraw, BrickLink, LEGO) | API key | **API** for verified mappings, once a key is supplied | Client written, disabled without `REBRICKABLE_API_KEY`. ⚠ |
| LDraw parts library | Part geometry, names, colours (LDConfig) | Published zips (`npm run ldraw:fetch`) | **Download**, CC BY 2.0 / 4.0 attribution | Existing tooling; pipeline reads `parts-meta.json` and `.ldraw/` if present. |
| LDraw OMR | Structured set models (MPD with steps) | Public set pages + file URLs | **Download** models whose header licence is CC BY; keep author and licence | Implemented (index + model fetch), verified on the sample. |
| User uploads | Their own LDR/MPD/PDF/images | App upload | **Private by default**; stored for the uploader only | Schema + storage gate implemented; no upload UI on this branch. |

## 1. Official LEGO building instructions (lego.com)

Pages read 2026-11-10:
- Terms of Use, https://www.lego.com/en-us/legal/terms-of-use/ ("Last Modified: February 27, 2026"). The older URL
  `/legal/notices-and-policies/terms-of-use-for-lego-websites` returns 404.
- Fair Play policy, https://www.lego.com/en-us/legal/notices-and-policies/fair-play (the fetched text was truncated;
  the instructions section is from a summary, so treat it as needing a full read).
- Building instructions, https://www.lego.com/en-us/service/building-instructions and
  https://www.lego.com/en-us/service/building-instructions/21368.
- robots.txt, https://www.lego.com/robots.txt: `/service/` is not disallowed for `*`.

| Field | Finding |
| --- | --- |
| Available data | Per set: name, number, piece count, year, and one entry per booklet with file size and a PDF link. 21368 lists one booklet, "(1/1), 39.98MB (PDF)", at `https://www.lego.com/cdn/product-assets/product.bi.core.pdf/6651647.pdf`. |
| Access method | Public HTML pages. No API, bulk feed or data licence was found. LEGO points people to the LEGO Builder app. |
| Licence | All rights reserved. The Terms allow downloads "for non-commercial, home personal use only". They forbid copying, republishing or distributing site content for public or commercial purposes without written permission. |
| Automated access | robots.txt allows `/service/`. The Terms have a "No AI" clause: LEGO does not consent to the site being used or downloaded to develop, train or **operate** AI or ML systems, including through automated systems. |
| Redistribution | Not allowed. The Fair Play policy (summary) calls copying, scanning and distributing instructions online an infringement, and tolerates only limited unaltered extracts for non-commercial commentary. |
| Completeness | Most sets from about the 2000s on; older sets patchy. One or more booklets per set, sometimes per language/region. |
| Update frequency | New sets appear around release; revisions appear occasionally. |
| Integration complexity | Medium (HTML parsing), and legally the riskiest source. |
| **Decision** | **Reference only.** Store the set page URL, booklet label, PDF URL, size and last-checked date when a person or an authorized index supplies them. Do not fetch lego.com automatically. Do not download, store or serve PDFs or page images. A user who owns a set may upload their own copy privately (see §6). |

**⚠ owner decision 1.** Running the PDF → 3D stages (`segment`, `recognise`) on LEGO instruction PDFs uses an AI
system on LEGO site content. Read literally, the Terms' "No AI" clause covers *operating* AI systems on downloaded
site content. Until the owner decides (ideally with legal advice or written permission from LEGO), the queue
accepts PDF documents only from private user uploads, and the AI stages stay stubbed.

**⚠ owner decision 2.** Should the pipeline fetch lego.com set pages automatically to discover booklet references?
robots.txt allows it, but the Terms say nothing explicit about automated discovery. The current answer is no: the
`manual` adapter takes references from a file the owner curates.

Trademark rules (Fair Play, summary): no LEGO logo on unofficial sites; use "LEGO" as an adjective with ®; do not put
it in a domain name; show a disclaimer that LEGO does not sponsor, authorize or endorse the site. API responses carry
the disclaimer in `attribution`.

## 2. Brickset API v3

Pages tried 2026-11-10: https://brickset.com/article/52664/api-version-3-documentation,
https://brickset.com/tools/webservices/requestkey, https://brickset.com/terms, https://brickset.com/robots.txt.
**All returned 403 with a Cloudflare challenge** (`cf-mitigated: challenge`). We did not try to get past it.

| Field | Finding |
| --- | --- |
| Available data | **Unverified.** Earlier project notes (docs/PLAN.md) say v3 has `getInstructions` / `getInstructions2`, which return instruction descriptions and URLs per set. |
| Access method | API key, requested by a person through the Brickset site. |
| Licence / limits / redistribution | **Unverified.** Not readable from this machine. |
| Completeness / update frequency | Unverified. |
| Integration complexity | Low once a key and the terms are available (JSON over HTTPS). |
| **Decision** | **API, reference only**, once the owner (a) requests a key and (b) reads the API terms in a browser and records the daily call limit and caching rules here. |

**⚠ owner decision 3.** Request a Brickset API key, read the API terms in a browser, and paste the key into
`BRICKSET_API_KEY` and the limits into this section. The adapter (`pipeline/discovery/brickset.ts`) is written
against the documented method name. It is **untested against the live API** and refuses to run without a key.

## 3. Rebrickable (bulk CSVs and API v3)

Pages tried 2026-11-10: https://rebrickable.com/api/, https://rebrickable.com/api/v3/docs/,
https://rebrickable.com/downloads/, https://rebrickable.com/terms/. **All returned HTTP 402** to our client; no
content was read. robots.txt (https://rebrickable.com/robots.txt) was readable. For `User-agent: *` it sets
`Crawl-delay: 3` and disallows `/api/v3/lego/*` (crawling of API URLs), `*.pdf` and
`/instructions/*/*/download/*`. It also sets `Content-Signal: ai-train=no, search=yes, ai-input=yes`.

The bulk files on `cdn.rebrickable.com/media/downloads/` are not covered by those rules and download normally:

| File | Rows (2026-11-10) | gz size | Last-Modified |
| --- | ---: | ---: | --- |
| themes.csv.gz | 496 | 4.5 KB | 2026-11-09 |
| colors.csv.gz | 275 | 4.9 KB | 2026-11-09 |
| part_categories.csv.gz | 76 | 0.9 KB | 2026-11-09 |
| parts.csv.gz | 64,955 | 1.06 MB | 2026-11-09 |
| part_relationships.csv.gz | 37,598 | 197 KB | 2026-11-09 |
| elements.csv.gz | 114,787 | 1.14 MB | 2026-11-09 |
| sets.csv.gz | 28,587 | 523 KB | 2026-11-08 |
| minifigs.csv.gz | 17,364 | 305 KB | 2026-11-08 |
| inventories.csv.gz | 47,908 | 268 KB | 2026-11-09 |
| inventory_parts.csv.gz | 1,573,339 | 14.3 MB | 2026-11-09 |
| inventory_minifigs.csv.gz | 25,986 | 99 KB | 2026-11-09 |
| inventory_sets.csv.gz | 5,217 | 19 KB | 2026-11-09 |

(Row counts exclude the header line.) The files send `ETag` and `Last-Modified`, so the importer uses conditional GETs.

| Field | Finding |
| --- | --- |
| Available data | Catalog facts: themes, colours (RGB, transparency), part categories, parts, part relationships (print/mould/alternate/sub-part), LEGO element IDs → part + colour, sets, minifigs, inventories with spares, minifigs and sub-sets. **No LDraw or BrickLink IDs in the CSVs** (the API has `external_ids`). |
| Access method | CSVs: public CDN, no key. API: key required (per earlier project notes; unverified). |
| Licence | **Unverified** (terms page unreadable). Earlier project notes say the terms require attribution and limit bulk redistribution. We follow that: attribute in docs and API, and never republish the CSVs or the full tables as a download. |
| Automated access | CDN downloads: one conditional GET per file per run, at most daily (files change daily). API: crawl rules in robots.txt; documented rate limit unverified. The API client waits at least 1 s between calls. |
| Redistribution | Serve derived per-set answers through our API (inventory for one set, piece counts). Do not offer bulk exports. |
| Completeness | Very high for sets and inventories. Element IDs incomplete for old parts. |
| Update frequency | Daily (Last-Modified dates show nightly regeneration). |
| Integration complexity | Low (CSV) / low (API). |
| **Decision** | **Download** the CSVs into PostgreSQL with provenance. **API** only for part external IDs, after the owner supplies `REBRICKABLE_API_KEY`. |

**⚠ owner decision 4.** Read https://rebrickable.com/terms/ and the API page in a browser and confirm that importing
the CSVs into a database, and serving per-set derived data with attribution, is allowed. The importer runs today
because the project already relied on these files (`bom.ts`). Record the outcome here.

**⚠ owner decision 5.** Supply a Rebrickable API key if you want verified Rebrickable ↔ LDraw / BrickLink mappings.
Without one, inventory reconciliation against LDraw models can only report *candidate* matches (identical part
numbers), and no model can reach `verified` unless a person verifies the mappings.

## 4. LDraw parts library

Pages read 2026-11-10: https://www.ldraw.org/docs-main/licenses/legal-info.html,
https://www.ldraw.org/article/349.html (Contributor Agreement, 2024-06-06), https://www.ldraw.org/robots.txt
(blocks only named SEO bots), https://library.ldraw.org/robots.txt (`Disallow:` empty, so everything is allowed).

| Field | Finding |
| --- | --- |
| Available data | ~20k+ part files (geometry, names, categories, keywords), LDConfig colour table, unofficial parts. |
| Access method | `complete.zip` and `ldrawunf.zip` from library.ldraw.org (`npm run ldraw:fetch`). |
| Licence | Parts carry `0 !LICENSE Redistributable under CCAL version 2.0` (CC BY 2.0) or, for newer work, CC BY 4.0 / CC0 under the 2024 Contributor Agreement. The per-file header decides. CC BY allows copying, derivative works and commercial use with attribution; LDraw says crediting "The LDraw Parts Library" is enough. |
| Automated access | Allowed by robots.txt. Download the zips, not individual files. |
| Redistribution | Allowed with attribution and a statement of the licence terms. Converted part libraries count as derivative works. |
| Completeness | Covers most common parts; newer and printed parts lag. |
| Update frequency | Official updates several times a year; unofficial daily. |
| Integration complexity | Already integrated (`tools/pack-ldraw.mjs`). |
| **Decision** | **Download.** Attribute "The LDraw Parts Library (CC BY 2.0 / CC BY 4.0), www.ldraw.org" in docs and API responses that carry geometry. |

## 5. LDraw Official Model Repository (OMR)

Pages read 2026-11-10: https://www.ldraw.org/article/593.html (OMR specification),
https://www.ldraw.org/docs-main/official-model-repository-omr/rules-and-procedures-for-the-official-model-repository.html,
https://library.ldraw.org/omr, https://library.ldraw.org/omr/sets (paginated with `?page=N`, 59 pages of 25 rows on
2026-11-10) and set pages such as https://library.ldraw.org/omr/sets/4515.

| Field | Finding |
| --- | --- |
| Available data | LDraw replicas of official sets only (no MOCs). MPD files with sub-models and `0 STEP` lines. Index columns: set number, name, theme, year, number of models. Each set page links model files at `https://library.ldraw.org/media/omr_models/<id>/<set>.mpd`. |
| Access method | Public HTML index + direct file links. No JSON API found (`/api` returns 404). |
| Licence | Per file header. New models: `0 !LICENSE Licensed under CC BY 4.0`. Legacy models: `Licensed under CC BY 2.0 and CC BY 4.0`. Embedded parts keep their own licence line. Each file names its `0 Author:`. |
| Automated access | Allowed by robots.txt. We fetch the index at most once per run with a 2 s delay between pages and cache it, and fetch only the models for sets we ask for. |
| Redistribution | Allowed under CC BY with author attribution and a licence statement. |
| Completeness | About 1,470 sets, mostly older themes. 21368 is not in it. |
| Update frequency | Irregular; a few models a month. |
| Integration complexity | Medium: MPD parser with sub-models, colour inheritance and free rotations. |
| **Decision** | **Download** models whose header licence is CC BY 2.0/4.0 or CC0. Store author, licence line, URL, checksum. Anything else (missing or unknown licence) stays reference only. |

The importer refuses to store a model whose `0 !LICENSE` line is missing or unrecognised, and records why.

## 6. User uploads

| Field | Finding |
| --- | --- |
| Available data | Whatever the user uploads: LDR/MPD, PDFs, photos. |
| Licence | The uploader's own rights. LEGO PDFs uploaded by a user are for that user's personal use only. |
| **Decision** | Stored **private** to the uploader by default (`visibility = 'private'`). Never published to other users or used as Guided Build for others unless the uploader owns the rights and opts in, and the content passes validation. Uploads of LEGO PDFs stay private permanently (the schema enforces `visibility = 'private'` for `kind = 'pdf'` uploads). |

## Attribution text used in API responses

```
Catalog data: Rebrickable (rebrickable.com). Part geometry: The LDraw Parts Library (CC BY 2.0 / CC BY 4.0), www.ldraw.org.
Models: LDraw Official Model Repository, author named per model, licence per model header.
LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this project.
```
