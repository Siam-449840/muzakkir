#!/usr/bin/env python3
"""
tier_quran_pool.py
==================
EDITORIAL QUALITY TIERING for the Quran Daily Reminder Pool.

Input:
  curated_quran_daily.json  — 3,243 structurally curated candidates
  master_quran_verified.json — 6,236 verses × 10 languages (source of truth)

Quality tiers:
  Tier A — Premium Daily Reminder
           Short, powerful, self-contained, iconic, heart-moving, direct.
           No context dependency. Clear spiritual meaning in isolation.
           Suitable for: notification headline, spiritual pause, reflection.

  Tier B — Strong Daily Reminder
           Meaningful and self-contained, but may be slightly longer
           or require minimal prior knowledge (Allah's name, Day of Judgment).
           NOT context-dependent on surrounding verses.
           Suitable for: daily notification.

  Tier C — Quran Reader Only
           Context-locked narrative dialogue, mid-sentence fragments,
           unnamed pronoun chains, specific historical sequences.
           NEVER used in daily reminder notifications.

Daily Reminder Pool = Tier A + Tier B
Final count determined by quality, not by a target number.

Text equality: every retained record verified against master_quran_verified.json.
No text modification. No paraphrasing. No label changes.

Outputs:
  assets/content/quran_daily.json.gz  — Tier A + Tier B × 10 languages
  assets/content/quran_tier_report.json — exact accounting per tier
"""

import json, gzip, re, sys
from pathlib import Path
from datetime import date
from collections import Counter

ROOT = Path(__file__).parent.parent

CURATED_QURAN = ROOT / 'curated_quran_daily.json'
MASTER_QURAN  = ROOT / 'master_quran_verified.json'
OUT_DIR       = ROOT / 'assets' / 'content'
OUT_DAILY     = OUT_DIR / 'quran_daily.json.gz'
OUT_REPORT    = OUT_DIR / 'quran_tier_report.json'

TARGET_LANGS = ['ar', 'en', 'zh', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'ur']


# ── TIER C DISQUALIFIERS ─────────────────────────────────────────────────────
# These patterns identify verses that are CONTEXT-LOCKED — they cannot stand
# alone as a daily reminder because they are mid-narrative, reply dialogue,
# or pronoun chains referring to entities established in prior verses.
# Applied to the English translation text (case-insensitive).

TIER_C_PATTERNS = [
    # Narrative dialogue (reply of a character — always needs context)
    re.compile(r'^(Allah |He |She |They |Moses |Pharaoh |Abraham |Noah |Lot |Jesus |Mary |Solomon |David |Joseph |Adam )?'
               r'(said|replied|responded|answered|retorted|declared|protested|exclaimed|argued),?\s*["\u201c\u2018]', re.I),

    # "He replied", "Moses replied", "They replied" — dialogue fragments
    re.compile(r'^(He|She|They|Moses|Pharaoh|Abraham|Noah|Satan|Iblis|Joseph|Solomon|David|'
               r'Jesus|Mary|Adam|Lot|Hud|Shu\u02bfayb|Salih|Zachariah|John)\s+(replied|said|responded|answered)', re.I),

    # "˹He˺ replied" / "˹They˺ responded"
    re.compile(r'^˹[^˺]+˺\s*(replied|said|responded|answered)', re.I),

    # "˹Remember˺ when" or "And ˹remember˺ when" — recall-frame, needs prior narrative
    re.compile(r'^(And\s+)?˹?[Rr]emember˺?\s+when\b', re.I),

    # "So when" — event sequence continuation
    re.compile(r'^So when\b', re.I),

    # Opens with unnamed pronoun as active subject of narrative
    re.compile(r'^(And\s+)?(they|he|she|it)\s+(were|was|had been|used to|would|said|did|came|went|took|made|called|'
               r'sought|found|told|showed|sent|wrote|met|killed|worshipped|denied|refused|rejected|drove|fled)\b', re.I),

    # "Leaving the..." / "Going to..." — participial fragment requiring prior subject
    re.compile(r'^(Leaving|Going|Taking|Saying|Telling|Knowing|Giving|Turning|Coming|Making|Returning)\s', re.I),

    # Historical narrative specifics with full-sentence context requirement
    re.compile(r'^(Pharaoh|Moses)\s+(protested|demanded|ordered|commanded|declared|asked|told)', re.I),

    # "˹Finally,˺ the surviving ex-prisoner remembered ˹Joseph˺" type
    re.compile(r'^˹[Ff]inally,?˺', re.I),

    # Sequential "the ___th" mid-enumeration
    re.compile(r'^(the )?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(of|one)', re.I),

    # "never out of season" — fragment without context
    re.compile(r'^never (out of|ending|ceasing)\b', re.I),

    # "leaving the wives" — mid-sentence fragment
    re.compile(r'^leaving (the|your|their)\b', re.I),

    # "to Pharaoh and his chiefs" — prepositional fragment
    re.compile(r'^to (Pharaoh|Moses|Abraham|Noah|the people)\b', re.I),
]


# ── TIER A QUALIFIERS ─────────────────────────────────────────────────────────
# Positive signals that earn Tier A (Premium Daily Reminder) status.
# A verse with ANY of these is Tier A, provided it is not disqualified by Tier C.

# Strong spiritual vocabulary that makes a verse self-contained and impactful
TIER_A_VOCAB = re.compile(
    r'\b(allah|god|lord|merciful|compassionate|forgiving|forgiveness|mercy|'
    r'paradise|heaven|hereafter|judgment day|day of judgment|reckoning|'
    r'believe|faith|believer|grateful|gratitude|patient|patience|tawbah|repent|'
    r'worship|prayer|salah|tawakkul|trust in allah|rely on|'
    r'guidance|guide|guided|straight path|righteous|righteousness|'
    r'light|truth|knowledge|wisdom|justice|pure|purify|'
    r'creation|creator|created|originator|sustainer|self-sufficient|'
    r'near|close to allah|with allah|sake of allah|fear allah|'
    r'best of creators|most wise|most knowing|all-knowing|all-seeing|'
    r'never despair|do not lose hope|do not grieve|do not fear|'
    r'sufficient for us|enough for us|our lord|my lord|your lord)\b',
    re.I
)

# Strong positive structural signals
TIER_A_OPENINGS = re.compile(
    r'^(O you who believe|O mankind|O humanity|O people|O children of Adam|'
    r'Say[,:]|Indeed|Verily|Surely|Certainly|Truly|'
    r'All praise|To Allah belongs|Glorified be|Glory be|Exalted be|'
    r'Allah is|Allah knows|Allah sees|Allah loves|Allah does not|'
    r'And your Lord|Your Lord|Our Lord|My Lord|'
    r'He is the|It is He who|It is Allah|'
    r'We have|We created|We sent|We revealed|'
    r'And those who believe|Those who believe|The believers|'
    r'Do not|Never|'
    r'So remember Allah|Remember your Lord|'
    r'Is the one who|Is not the one|'
    r'Only those who|Only Allah|'
    r'Whoever does|Whoever believes|Whoever fears|'
    r'No soul|No one|'
    r'With hardship|After hardship)',
    re.I
)

# Direct divine address (always Tier A — second person commands/promises from Allah)
TIER_A_DIVINE_ADDRESS = re.compile(
    r'^(O (you who believe|mankind|humanity|people|Prophet|My servant|children of Israel))',
    re.I
)


def classify_tier(
    content_id: str,
    arabic_word_count: int,
    notification_suitability: str,
    en_text: str,
    reason: str,
) -> tuple[str, str]:
    """
    Returns (tier, rationale) where tier is 'A', 'B', or 'C'.

    Tier C is disqualifying — checked first.
    Tier A requires positive signals.
    Tier B is everything in between.
    """

    # ── STEP 1: Check Tier C disqualifiers ───────────────────────────────────
    for pat in TIER_C_PATTERNS:
        if pat.search(en_text):
            snippet = pat.pattern[:50].replace('\n','')
            return 'C', f'Context-locked: matches pattern [{snippet}...]'

    # ── STEP 2: Additional structural Tier C checks ───────────────────────────
    en_stripped = en_text.strip()

    # Short fragments that are incomplete thoughts (wc ≤ 4 and clearly a fragment)
    if arabic_word_count <= 4:
        # Short but has no predicate / sounds incomplete
        fragment_patterns = [
            re.compile(r'^(As for the one who|As for those who|As for him who)\b', re.I),
            re.compile(r'^will surely be (gathered|raised|brought|punished)\b', re.I),
            re.compile(r'^(never out|that is their)\b', re.I),
        ]
        for fp in fragment_patterns:
            if fp.search(en_stripped):
                return 'C', 'Short context-dependent fragment'

    # "Those who" negative descriptions requiring prior context
    those_neg = re.compile(
        r'^(And |But )?(as for )?[Tt]hose (who were|of them who|among them who|whose hearts)\b',
        re.I
    )
    if those_neg.search(en_stripped):
        return 'C', 'Contextual reference to a specific group established earlier'

    # ── STEP 3: Check Tier A qualifiers ──────────────────────────────────────

    # Condition A1: explicit Tier A opening
    # BUT: downgrade 'Indeed/Surely, it is THEY/HE/SHE/IT who...' — looks like
    # a Tier A opening ('Indeed') but uses unnamed pronoun chain needing context.
    UNNAMED_PRONOUN_AFTER_OPENER = re.compile(
        r'^(Indeed|Verily|Surely|Certainly|Truly)[,!]?\s+(it is\s+)?(they|he|she|it)\s+who\b',
        re.I
    )
    if TIER_A_OPENINGS.search(en_stripped) and not UNNAMED_PRONOUN_AFTER_OPENER.search(en_stripped):
        return 'A', 'Tier A opening formula — self-contained and directive'

    # Condition A2: strong spiritual vocabulary + previously rated excellent
    if notification_suitability == 'excellent' and TIER_A_VOCAB.search(en_stripped):
        return 'A', 'Excellent suitability + strong spiritual vocabulary'

    # Condition A3: very short (≤ 6 words) with spiritual vocabulary
    if arabic_word_count <= 6 and TIER_A_VOCAB.search(en_stripped):
        return 'A', f'Concise ({arabic_word_count} Arabic words) with strong spiritual vocabulary'

    # Condition A4: excellent suitability + short (≤ 8 words)
    if notification_suitability == 'excellent' and arabic_word_count <= 8:
        return 'A', f'Excellent suitability, concise ({arabic_word_count} Arabic words), self-contained'

    # Condition A5: divine direct address
    if TIER_A_DIVINE_ADDRESS.search(en_stripped):
        return 'A', 'Direct divine address — universally applicable'

    # ── STEP 4: Default → Tier B ─────────────────────────────────────────────
    return 'B', 'Self-contained, meaningful, suitable for daily reminder'


def write_gz(path: Path, data: object) -> int:
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    compressed = gzip.compress(raw, compresslevel=9)
    tmp = Path(str(path) + '.tmp')
    tmp.write_bytes(compressed)
    tmp.rename(path)
    return len(compressed)


def main():
    print('=' * 68)
    print('  QURAN EDITORIAL QUALITY TIERING')
    print('=' * 68)

    # ── Load inputs ────────────────────────────────────────────────────────────
    with open(CURATED_QURAN, encoding='utf-8') as f:
        curated = json.load(f)
    with open(MASTER_QURAN, encoding='utf-8') as f:
        master = json.load(f)
    mq_by_id = {r['id']: r for r in master['records']}

    print(f'\nInput candidates:  {len(curated)}')

    # ── Step 1: Remove continuation-word items (structural pre-filter) ────────
    pre_filter = []
    cont_word_excluded = []
    for item in curated:
        if 'continuation word' in item['editorial_selection']['reason'].lower():
            cont_word_excluded.append(item['content_id'])
        else:
            pre_filter.append(item)
    print(f'After cont-word filter: {len(pre_filter)}  (removed {len(cont_word_excluded)})')

    # ── Step 2: Tier classification ───────────────────────────────────────────
    print('\nClassifying tiers…')
    tier_a, tier_b, tier_c = [], [], []
    missing_master = []

    for item in pre_filter:
        cid = item['content_id']
        rec = mq_by_id.get(cid)
        if not rec:
            missing_master.append(cid)
            continue

        en_text   = rec['translations']['en']['text']
        wc        = rec['arabic_word_count']
        suitability = item['editorial_selection']['notification_suitability']
        reason    = item['editorial_selection']['reason']

        tier, rationale = classify_tier(cid, wc, suitability, en_text, reason)

        # Verify all 10 language slots present and non-empty
        missing_langs = [l for l in TARGET_LANGS if not rec['translations'].get(l, {}).get('text', '').strip()]
        if missing_langs:
            tier_c.append({'id': cid, 'tier': 'C', 'rationale': f'Missing langs: {missing_langs}'})
            continue

        entry = {
            'content_id':         cid,
            'content_type':       'quran',
            'tier':               tier,
            'tier_rationale':     rationale,
            'reference': {
                'surah_number':           rec['reference']['surah_number'],
                'surah_name':             rec['reference']['surah_name'],
                'surah_name_translation': rec['reference']['surah_name_translation'],
                'ayah_number':            rec['reference']['ayah_number'],
                'juz':                    rec['reference'].get('juz'),
                'revelation_type':        rec['reference'].get('revelation_type'),
            },
            'arabic_word_count': wc,
            'suitability':       suitability,
            'translations': {
                lang: {
                    'text':       rec['translations'][lang]['text'],
                    'translator': rec['translations'][lang].get('translator', ''),
                }
                for lang in TARGET_LANGS
            },
        }

        if tier == 'A': tier_a.append(entry)
        elif tier == 'B': tier_b.append(entry)
        else: tier_c.append(entry)

    daily_pool = tier_a + tier_b
    print(f'\n  Tier A (Premium Daily Reminder):   {len(tier_a)}')
    print(f'  Tier B (Strong Daily Reminder):    {len(tier_b)}')
    print(f'  Tier C (Reader Only):              {len(tier_c)}')
    print(f'  Missing in master (anomaly):       {len(missing_master)}')
    print(f'  ─────────────────────────────────────────')
    print(f'  FINAL Daily Pool (A + B):          {len(daily_pool)}')

    # ── Step 3: Text equality verification ───────────────────────────────────
    print('\nVerifying text equality…')
    errors = 0
    for item in daily_pool:
        cid  = item['content_id']
        mrec = mq_by_id[cid]
        for lang in TARGET_LANGS:
            expected = mrec['translations'][lang]['text']
            actual   = item['translations'][lang]['text']
            if expected != actual:
                print(f'  ERROR: {cid} lang={lang} text mismatch!', file=sys.stderr)
                errors += 1

    if errors == 0:
        n_comp = len(daily_pool) * len(TARGET_LANGS)
        print(f'  ✅  {n_comp} comparisons — all match master source.')
    else:
        print(f'  ❌  {errors} text equality failures!', file=sys.stderr)
        sys.exit(1)

    # ── Step 4: Write quran_daily.json.gz ─────────────────────────────────────
    output = {
        'metadata': {
            'source':             'master_quran_verified.json',
            'generated_on':       str(date.today()),
            'preliminary_input':  len(curated),
            'continuation_word_excluded': len(cont_word_excluded),
            'tier_A_count':       len(tier_a),
            'tier_B_count':       len(tier_b),
            'tier_C_count':       len(tier_c),
            'missing_master':     len(missing_master),
            'final_daily_count':  len(daily_pool),
            'languages':          TARGET_LANGS,
            'tier_definitions': {
                'A': 'Premium Daily Reminder — short, self-contained, iconic, powerful, clear spiritual meaning in isolation',
                'B': 'Strong Daily Reminder — meaningful and self-contained, suitable for notification without prior context',
                'C': 'Reader Only — context-locked, narrative dialogue, unnamed pronoun chains, historical sequences',
            },
            'daily_pool': 'Tier A + Tier B',
            'text_equality_verified':    True,
            'text_equality_comparisons': len(daily_pool) * len(TARGET_LANGS),
            'text_equality_errors':      0,
        },
        'items': daily_pool,
    }

    sz = write_gz(OUT_DAILY, output)
    print(f'\n  quran_daily.json.gz written: {sz/1e6:.2f} MB  ({len(daily_pool)} items)')

    # ── Step 5: Write tier report ──────────────────────────────────────────────
    tier_c_reasons = Counter(
        x.get('tier_rationale', x.get('rationale', '?'))
        if isinstance(x, dict) and 'tier_rationale' in x
        else x.get('rationale', '?')
        for x in tier_c
    )

    report = {
        'generated_on':          str(date.today()),
        'preliminary_candidates': len(curated),
        'continuation_word_excluded': len(cont_word_excluded),
        'post_structural_filter': len(pre_filter),
        'tier_A':                len(tier_a),
        'tier_B':                len(tier_b),
        'tier_C':                len(tier_c),
        'missing_master':        len(missing_master),
        'final_daily_pool':      len(daily_pool),
        'tier_C_reason_breakdown': dict(tier_c_reasons.most_common(20)),
        'tier_A_sample_ids':     [x['content_id'] for x in tier_a[:30]],
        'tier_B_sample_ids':     [x['content_id'] for x in tier_b[:30]],
        'tier_C_sample':         [
            {'id': x['content_id'] if 'content_id' in x else x.get('id','?'),
             'reason': x.get('tier_rationale', x.get('rationale','?'))}
            for x in tier_c[:30]
        ],
        'duration_estimates': {
            '5_per_day_3Q2H': {
                'quran_unique_days':  len(daily_pool) // 3,
                'hadith_unique_days': 699 // 2,
                'bottleneck':         'Hadith at ~350 days',
            },
            '3_per_day_2Q1H': {
                'quran_unique_days':  len(daily_pool) // 2,
                'hadith_unique_days': 699,
                'bottleneck':         'Hadith at ~699 days (~1.9 years)',
            },
            '2_per_day_1Q1H': {
                'quran_unique_days':  len(daily_pool),
                'hadith_unique_days': 699,
                'bottleneck':         f'Hadith at 699 days (~1.9 years)',
            },
        },
    }

    OUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_REPORT, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # ── Summary ────────────────────────────────────────────────────────────────
    print()
    print('=' * 68)
    print('  FINAL QURAN TIERING — EXACT RECONCILIATION')
    print('=' * 68)
    print(f'  Input candidates:              {len(curated)}')
    print(f'  - Continuation-word excluded: -{len(cont_word_excluded)}')
    print(f'  - Tier C (reader only):       -{len(tier_c)}')
    print(f'  - Missing in master:          -{len(missing_master)}')
    print(f'  ─────────────────────────────────────────────')
    print(f'  Tier A (Premium):              {len(tier_a)}')
    print(f'  Tier B (Strong):               {len(tier_b)}')
    print(f'  FINAL Daily Pool (A+B):        {len(daily_pool)}')
    print()
    print(f'  Duration estimates at 5/day (3Q+2H):')
    print(f'    Quran unique:  {len(daily_pool)//3} days  ({len(daily_pool)//3/365:.1f} yr)')
    print(f'    Hadith unique: 350 days  (0.96 yr) ← BOTTLENECK')
    print()
    print(f'  Compressed runtime file: {sz/1e6:.2f} MB')
    print(f'  Text equality: ✅ {len(daily_pool)*len(TARGET_LANGS)} comparisons — all match master source')
    print('=' * 68)


if __name__ == '__main__':
    main()
