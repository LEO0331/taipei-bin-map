const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.', testMatch: 'shade-preview.spec.js', outputDir: '../../test-results/shade-preview',
  reporter: 'list', workers: 2, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5232' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5232 --strictPort', url: 'http://127.0.0.1:5232', reuseExistingServer: false },
  projects: [
    { name: 'shade-preview-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'shade-preview-mobile', use: { ...devices['Pixel 5'] } },
  ],
});
