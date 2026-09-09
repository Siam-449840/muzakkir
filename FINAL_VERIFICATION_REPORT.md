# FINAL VERIFICATION REPORT

Generated: 2026-08-28
Scope: Quran + Hadith daily-reminder content pipeline, built and audited in one execution pass against real, named, fetchable upstream sources.

**Read this first — terminology:**
- **"Upstream-verified" / "source-consistent"** = this pipeline programmatically compared its data, character-for-character, against a named open-source dataset, and it matched. This is a *data-provenance* claim.
- **"Sahih" / grading labels** = reported verbatim from named scholars cited *inside the source dataset* (e.g. Al-Albani, Shu'ayb al-Arna'ut), or — for Riyad as-Salihin — Imam an-Nawawi's own inline citation in his original text. **Nothing in this pipeline performed independent isnad/matn scholarly authentication.**
- **"Excellent / good / conditional / not_suitable"** = AI-assisted editorial heuristics for notification suitability only. Not a religious ruling. Explicitly labeled as such in every record.

---

## 1. What was actually verified (full-corpus, not sampled)

### Quran
- Fetched real upstream: `github.com/fawazahmed0/quran-api` (tag `1`) — the exact repository your prior VERIFICATION_REPORT.md named.
- Compared **all 6,236 verses × 10 languages = 62,360 text comparisons** against the specific translator editions your file claimed (Khattab, Muhiuddin Khan, Ma Jian, Farooq Khan & Ahmed, Isa Garcia, Hamidullah, Helmi Nasr, Elmir Kuliev, Fateh Muhammad Jalandhry, plus the Arabic Uthmani Hafs text) → **0 mismatches**.
- Compared surah name, Arabic surah name, English surah name, juz, and revelation type for all 6,236 verses against upstream `info.json` → **0 mismatches**.
- **Result: the Quran file's own claims check out completely against the exact source it cites.**

### Hadith — Sahih al-Bukhari & Sahih Muslim
- Fetched real upstream: `github.com/fawazahmed0/hadith-api` (tag `1`).
- Compared **15,152 records × 5 languages (ar/en/bn/ur/fr) = 75,760 text comparisons** → **0 mismatches**, including exact agreement on upstream's own 462 empty-placeholder records (chapter-boundary entries with no narration text — a real gap in the *source*, correctly mirrored, not invented).
- Compared `book_number` / `in_book_hadith_number` for all 15,152 records against upstream reference metadata → **0 mismatches**.
- Confirmed `individual_grades` was correctly left empty for every Bukhari/Muslim record (matches upstream — no per-hadith grading exists for these two collections in this source; consistent with their Sahihayn consensus status).
- **Correction to the prior report**: it claimed "431 hadith with identical English text." Recount found **608 records across 294 duplicate-text groups**. Not fabrication — a measurement discrepancy, now corrected and logged in `rejected_items.json`. The underlying phenomenon (Bukhari re-narrating hadith across chapters) is real and expected; no records were removed.

---

## 2. Additional Hadith collections — what was added and how

Upstream `fawazahmed0/hadith-api` also carries **Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, and Muwatta Malik**, each with real per-hadith grading from named scholars (Al-Albani, Shu'ayb al-Arna'ut, Ahmad Muhammad Shakir, Zubair Ali Zai, Muhammad Fouad Abd al-Baqi, Salim al-Hilali, Abu Ghuddah).

**Inclusion rule applied** (mechanical, documented, conservative): a hadith was added to the trusted master corpus **only if every grading scholar cited for it used a grade containing "Sahih," with no grade containing any form of "da'if"/weak**. Anything mixed, Hasan-only, ungraded, or weak was excluded and logged individually in `rejected_items.json` with its actual grades preserved.

| Collection | Total in source | Included (sahih_consensus) | Excluded |
|---|---|---|---|
| Sunan Abi Dawud | 5,274 | 2,686 | 2,588 |
| Jami` at-Tirmidhi | 3,998 | 2,069 | 1,929 |
| Sunan an-Nasa'i | 5,765 | 3,495 | 2,270 |
| Sunan Ibn Majah | 4,343 | 2,201 | 2,142 |
| Muwatta Malik | 1,858 | 1,443 | 415 |
| **Total** | **21,238** | **11,894** | **9,344** |

No collection was blanket-labeled Sahih. Each included record carries its actual cited grades verbatim.

### Riyad as-Salihin
**Not present** in `fawazahmed0/hadith-api` at all — investigated separately per your instruction. Found in a different real, ISC-licensed repository (`github.com/AhmedBaset/hadith-json`, scraped from sunnah.com): **1,896 narrations**, Arabic + English, complete.

This source has no separate scholarly "grade" field. Instead, Imam an-Nawawi's own Arabic text carries inline source citations (متفق عليه = "agreed upon," رواه مسلم, etc.). I extracted these automatically: **1,834 of 1,896 records** had a detectable inline citation; **62 did not** and are marked `source_citation_not_detected` rather than assumed authentic. The collection was **not** treated as uniformly Sahih, and — being a step further from independent verification than the grade-filtered collections above — it was **excluded from the curated daily-reminder pool** even though it's in the master file. That's a deliberately conservative call; flag it if you'd like it reconsidered.

---

## 3. Ten-language requirement — actual status

### Quran: 10/10 languages verified
Arabic (original), English, Bengali, Chinese (Simplified), Hindi, Spanish, French, Portuguese, Russian, Urdu — every one matched its named upstream edition exactly (see §1). Full translator/publisher identity for each is in `translation_sources.json`.

### Hadith: 5/10 languages available and verified
Arabic, English, Bengali, Urdu, French — verified (see §1).
**Spanish, Portuguese, Hindi, Chinese: not available.** I checked every collection in `fawazahmed0/hadith-api` — none has editions in these four languages, for any of the 8 collections. I did not find another open, scholar-attributed, redistributable dataset for them either. This matches what your own VERIFICATION_REPORT.md already said. I did **not** substitute machine translation. Each of these 4 languages is recorded in `translation_sources.json` with `translation_status: "not_verified"` and an explanation of what was checked.

To close this gap you would need either a licensed commercial translation (e.g. Darussalam catalog) or a commissioned/verified scholarly translation — not something this pipeline can manufacture.

---

## 4. Tafsir

`github.com/spa5k/tafsir_api` is real, not just mentioned — I fetched its actual edition registry (122 editions) and pulled one live sample (Ibn Kathir, English, Ayat al-Kursi 2:255 — 17KB of genuine commentary text) to confirm the API isn't a stub.

**13 editions registered** in `tafsir_sources.json` covering Ibn Kathir (ar/en/ur/bn), Tabari (ar), Qurtubi (ar), Sa'di (ar/ru), and Jalalayn (ar/en/id) — with author, language, source host, and a fetch pattern for on-demand retrieval.

**I did not bulk-download or embed the full tafsir text into any deliverable.** The repo's MIT license covers the code/aggregation, not necessarily the underlying translated commentary (which may carry separate publisher rights) — this is flagged explicitly in `sources.json`. Recommendation: fetch tafsir on-demand per verse in the app, with attribution, rather than shipping a bundled copy.

No AI-generated explanation was created or mixed into this registry.

---

## 5. Curated daily-reminder selection — methodology (fully disclosed)

This is **editorial curation**, not scholarly verification, and is labeled as such in every record.

**Quran** — starting pool: all 6,236 verified verses.
- Excluded outright (`not_suitable`): exceed 15-Arabic-word short-form threshold, under 3 words (fragment), or contain specific legal/penal/inheritance detail requiring full juristic context.
- `conditional` (989 verses): opens with a continuation word (and/then/so/...) suggesting dependence on prior verses — held back from the curated pool pending human review.
- `excellent` (715) / `good` (2,528): short, grammatically self-contained; `excellent` additionally matches a reflective/spiritual keyword (mercy, patience, gratitude, guidance, etc.).
- **Curated Quran pool: 3,243 verses** (excellent + good).

**Hadith** — starting pool: 15,152 Bukhari/Muslim (collection-wide Sahih) + 11,894 sahih_consensus-filtered expansion records = 27,046 candidates. Riyad as-Salihin was **not** included in this pass (see §2).
- Same length/red-flag filtering, plus a virtue-keyword check (faith, prayer, patience, mercy, forgiveness, honesty, kindness, family, remembrance, akhirah, etc.).
- **Curated Hadith pool: 7,580 records** (1,151 excellent + 6,429 good).

No target count was imposed in either direction — these numbers are simply what the filters produced.

---

## 6. Random sample audit (reproducible, actual run — not invented)

Seed: `20260828`. Ran `random.sample()` against the full local datasets and diffed each against upstream.

- **Quran: 100 records sampled → 100/100 matched upstream exactly across all 10 languages.**
- **Hadith: 100 records sampled (Bukhari+Muslim) → 100/100 matched upstream exactly across all 5 languages.**

Full sample IDs are in `sample_audit_results.json` for reproducibility. Given the full-corpus diff already performed in §1, this sample is confirmatory rather than the primary evidence.

---

## 7. Programmatic validation

Ran against every deliverable file: JSON syntax ✓, UTF-8 validity ✓, unique IDs (6,236 Quran / 28,942 Hadith, no duplicates) ✓, zero orphan `content_id` references from curated files into master files ✓, no missing `reference` fields ✓.

---

## 8. Exact final counts

| Metric | Count |
|---|---|
| Quran master (verified) | 6,236 |
| Hadith master (verified, all 8 collections) | 28,942 |
| — Bukhari | 7,589 |
| — Muslim | 7,563 |
| — Nasa'i (sahih_consensus filtered) | 3,495 |
| — Abu Dawud (sahih_consensus filtered) | 2,686 |
| — Ibn Majah (sahih_consensus filtered) | 2,201 |
| — Tirmidhi (sahih_consensus filtered) | 2,069 |
| — Riyad as-Salihin (complete, citation-annotated) | 1,896 |
| — Muwatta Malik (sahih_consensus filtered) | 1,443 |
| Curated Quran (daily pool) | 3,243 |
| Curated Hadith (daily pool) | 7,580 |
| Quran languages verified | 10 / 10 |
| Hadith languages verified | 5 / 10 (es/pt/hi/zh not available anywhere found) |
| Hadith records rejected (uncertain/weak grading) | 9,137 |
| Hadith records rejected (missing text) | 207 |
| Records sampled and audited | 200 (100 Quran + 100 Hadith), 100% pass |
| Tafsir editions registered (not bulk-embedded) | 13 |
| Additional Hadith collections included | 6 (Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik, Riyad as-Salihin) |
| Additional Hadith collections excluded | 0 investigated collections were fully excluded — all 6 you asked about were found and processed |

---

## 9. Licensing limitations (read before shipping)

- `fawazahmed0/quran-api` and `fawazahmed0/hadith-api`: repository/code is Unlicense (public domain). This does **not** by itself prove the underlying named translations (e.g. Mustafa Khattab's "The Clear Quran," Helmi Nasr's Portuguese Quran) are free of separate publisher copyright — it only means this specific aggregation repo imposes no extra restriction. Not independently re-verified against each publisher.
- `AhmedBaset/hadith-json` (Riyad as-Salihin source): repo code is ISC; underlying sunnah.com translation terms not independently re-verified — flagged `licensing_uncertain`.
- `spa5k/tafsir_api`: repo code is MIT; underlying tafsir translation text likely carries separate publisher rights — flagged `licensing_uncertain`, and for that reason **not bulk-embedded**.

## 10. Remaining unresolved issues

1. Spanish/Portuguese/Hindi/Chinese hadith translations remain unfound in open form — requires a licensing decision, not more searching by this pipeline.
2. The 989 `conditional` Quran verses and the 62 Riyad as-Salihin records without a detected citation need actual human editorial review before any future inclusion — heuristics flagged them, they don't resolve them.
3. Full tafsir text was spot-checked (1 verse) for existence, not verified verse-by-verse across all 6,236 ayat for all 13 registered editions — treat `tafsir_sources.json` as a verified *registry*, not a verified *corpus*.
4. The editorial curation keyword lists (§5) are a first pass, not a substitute for a human editor or Islamic content reviewer signing off before shipping to end users.
