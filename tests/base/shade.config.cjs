const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.', testMatch: 'shade-base.spec.js', outputDir: '../../test-results/shade-base',
  reporter: 'list', workers: 2, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5233/taipei-bin-map/' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5233 --strictPort --base=/taipei-bin-map/ --outDir=test-results/shade-base-build', url: 'http://127.0.0.1:5233/taipei-bin-map/', reuseExistingServer: false },
  projects: [
    { name: 'shade-base-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'shade-base-mobile', use: { ...devices['Pixel 5'] } },
  ],
});
