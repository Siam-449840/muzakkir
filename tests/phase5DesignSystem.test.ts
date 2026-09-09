import * as fs from 'fs';
import * as path from 'path';
import { colors, space, radius, touchTarget, contentConstraints } from '../src/theme/tokens';
import { typography } from '../src/theme/typography';

describe('Phase 5: Design System & Visual Consistency', () => {
  describe('Central Design Tokens', () => {
    test('core color palette adheres to serene Islamic aesthetic', () => {
      expect(colors.canvas).toBe('#FAF7F2');
      expect(colors.surface).toBe('#FFFFFF');
      expect(colors.primary).toBe('#14382A');
      expect(colors.primaryDark).toBe('#0D261C');
      expect(colors.gold).toBe('#C5A059');
      expect(colors.textPrimary).toBe('#1C1917');
    });

    test('spacing scale follows predictable arithmetic rhythm', () => {
      expect(space.xs).toBe(4);
      expect(space.sm).toBe(8);
      expect(space.md).toBe(12);
      expect(space.lg).toBe(16);
      expect(space.xl).toBe(20);
      expect(space.xxl).toBe(24);
      expect(space.xxxl).toBe(32);
    });

    test('corner radius tokens are consistent', () => {
      expect(radius.xs).toBe(4);
      expect(radius.sm).toBe(6);
      expect(radius.md).toBe(10);
      expect(radius.lg).toBe(14);
      expect(radius.xl).toBe(18);
      expect(radius.xxl).toBe(24);
    });

    test('minimum interactive touch target is accessible (>= 44dp)', () => {
      expect(touchTarget.min).toBeGreaterThanOrEqual(44);
    });

    test('content width constraints follow responsive reading standards', () => {
      expect(contentConstraints.maxReadingWidth).toBe(680);
      expect(contentConstraints.maxModalWidth).toBe(480);
      expect(contentConstraints.maxFloatingCardWidth).toBe(520);
    });
  });

  describe('Typography Roles', () => {
    test('Arabic Quran typography specifies generous line height for legibility', () => {
      expect(typography.arabicQuran.fontSize).toBe(26);
      expect(typography.arabicQuran.lineHeight).toBe(48);
      expect(typography.arabicQuran.writingDirection).toBe('rtl');
    });

    test('Reading body translation provides comfortable reading line height', () => {
      expect(typography.readingBody.fontSize).toBe(16);
      expect(typography.readingBody.lineHeight).toBe(27);
    });
  });

  describe('Component Primitives Integrity', () => {
    test('SearchField component file exists and contains accessible search implementation', () => {
      const filePath = path.resolve(__dirname, '../src/components/common/SearchField.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('export const SearchField');
      expect(content).toContain('accessibilityRole="search"');
      expect(content).toContain('accessibilityLabel');
      expect(content).toContain('minHeight: touchTarget.min');
    });

    test('ScreenHeader synchronizes system status bar with variant', () => {
      const filePath = path.resolve(__dirname, '../src/components/common/ScreenHeader.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('StatusBar');
      expect(content).toContain("barStyle={isEmerald ? 'light-content' : 'dark-content'}");
    });

    test('All 4 screens use the unified SearchField component', () => {
      const screens = [
        'QuranListScreen.tsx',
        'HadithListScreen.tsx',
        'HadithChapterScreen.tsx',
        'HadithSectionScreen.tsx',
      ];
      for (const screen of screens) {
        const filePath = path.resolve(__dirname, `../src/screens/${screen}`);
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content).toContain('SearchField');
      }
    });

    test('Tafsir remains strictly prohibited in all screens and components', () => {
      const srcDir = path.resolve(__dirname, '../src');
      const checkDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            expect(content.toLowerCase()).not.toContain('tafsirregistry');
            expect(content.toLowerCase()).not.toContain('tafsircommentary');
          }
        }
      };
      checkDir(srcDir);
    });
  });
});

