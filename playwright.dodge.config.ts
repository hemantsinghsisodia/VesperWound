import { defineConfig } from '@playwright/test';
import enemy from './playwright.enemy.config';
export default defineConfig({ ...enemy, testMatch:'**/baton-dodge.spec.ts', outputDir:'.cache/dodge-browser-results' });
