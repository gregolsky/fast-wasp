// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npx serve . -p 8080 --no-clipboard',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:8080' },
});
