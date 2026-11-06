// Writes PRIVACY.md from src/legal/privacyPolicy.ts, so the public copy matches the app.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { privacyPolicyMarkdown } from '../src/legal/privacyPolicy';

writeFileSync(join(__dirname, '..', 'PRIVACY.md'), privacyPolicyMarkdown());
