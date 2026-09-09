import * as fs from 'fs';
import * as path from 'path';

describe('Hadith 52,856 Exhaustive Forensic Parity Test', () => {
  it('should verify parity report confirms exactly 52,856 source and app records with matching SHA-256', () => {
    const reportPath = path.join(__dirname, '../scratch/exhaustive_52856_parity_report.json');
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    expect(report.total_source_records).toBe(52856);
    expect(report.total_app_records).toBe(52856);
    expect(report.records_identical).toBe(true);
    expect(report.sha256_match).toBe(true);
    expect(report.field_mismatches.raw_id).toBe(0);
    expect(report.field_mismatches.chapter_id).toBe(0);
    expect(report.field_mismatches.section_id).toBe(0);
    expect(report.field_mismatches.arabic).toBe(0);
    expect(report.field_mismatches.clean_arabic).toBe(0);
    expect(report.field_mismatches.translation).toBe(0);
    expect(report.field_mismatches.narrator).toBe(0);
    expect(report.field_mismatches.note).toBe(0);
    expect(report.field_mismatches.grade_id).toBe(0);
    expect(report.field_mismatches.order).toBe(0);
  });
});
