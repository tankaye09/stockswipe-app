// The privacy policy, in one place. The in-app screen (src/app/privacy.tsx) shows it, and
// PRIVACY.md in the repo root is generated from it (`npm run privacy`) so the store listings
// can link to a public copy. A unit test fails if the two drift apart.
//
// Keep it true: when the app starts collecting something new, update this file in the same
// PR, along with the store privacy labels (see SECURITY.md).

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/** Who runs the app. Fill in before the policy is shared outside the beta. */
export const OPERATOR_NAME = "[Kaye's full legal name]";
export const PRIVACY_EMAIL = '[privacy contact email]';
export const POLICY_UPDATED = '6 November 2026';

export const POLICY_TITLE = 'Haystack privacy policy';

export const PRIVACY_POLICY: PolicySection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `This policy explains what information the Haystack app ("Haystack", "we", "us") collects, why, and the choices you have. Haystack is run by ${OPERATOR_NAME}, an individual based in Singapore, until a company is set up. We follow Singapore's Personal Data Protection Act 2012 (PDPA).`,
    ],
  },
  {
    heading: 'The short version',
    bullets: [
      "You don't need an account. We don't ask for your name, email or phone number.",
      'Your interests, watchlist and paper trades stay on your phone.',
      'If you buy Premium, Apple or Google handles the payment. Our payments provider, RevenueCat, gets a random ID and your purchase status, never your card details.',
      "Free users see ads from Google AdMob. They are not personalised: we don't use your activity to target ads, and we don't track you across other apps.",
      "We don't sell your data.",
    ],
  },
  {
    heading: 'What we collect and why',
    paragraphs: [
      'Stored only on your device. Your chosen interests and markets, filters, watchlist, recently seen stocks, daily swipe count, your selected broker, and your paper trading balance, positions and history. This never leaves your phone. Deleting the app, or tapping "Reset app" in Settings, erases it.',
      'Market data. Stock prices and company information come from our own database, hosted by Supabase. To send them, Supabase sees the basic details of each request, such as your IP address and app version. The requests say nothing about you, your watchlist or your trades.',
      "Purchases (RevenueCat). If you subscribe to Premium, RevenueCat receives a random app user ID, your device type and app version, and your purchase and subscription status from Apple or Google. We use it to unlock Premium and restore your purchases. Card and billing details are handled by Apple or Google and are never shared with us. See RevenueCat's privacy policy.",
      "Ads (Google AdMob). Free users see an ad card every few swipes. We ask Google for non-personalised ads only. Google still receives limited device and usage information (such as IP address, device type, operating system and how the ad was viewed) to deliver the ad, limit how often you see it, measure it and prevent fraud. We don't use your device's advertising ID for tracking. Where the law requires it (for example in the EU or UK), Google's consent form is shown before any ad loads. See Google's privacy policy.",
      "Broker links. If you tap a broker's button or sign-up link, the broker's website or app opens. Anything you do there is covered by the broker's own privacy policy. Some links include a referral code, so we may earn a fee if you sign up. The broker doesn't learn anything about your activity in Haystack.",
      'App updates. The app may download updates from Expo (EAS Update). Expo sees your IP address, device type and app version to send the right update.',
      'Beta testing. If you test Haystack through TestFlight or Google Play testing, Apple or Google may share the feedback, screenshots and crash reports you choose to send, with your tester name or email, under their own privacy policies.',
    ],
  },
  {
    heading: "What we don't do",
    bullets: [
      "We don't collect your name, email, phone number, contacts, location, photos or device identifiers for tracking.",
      "We don't sell or rent personal data.",
      "We don't use your data to give investment advice. Haystack is for information and education only.",
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Data on your device stays until you delete it. RevenueCat keeps purchase records for as long as needed to manage your subscription and meet accounting and legal requirements. Google, Supabase and Expo keep request logs under their own retention policies.',
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      `Under the PDPA you can ask to access or correct personal data we hold about you, or withdraw consent to its use. Because we don't hold accounts, most of your data is on your own phone, and you can view or delete it there. For purchase records, email ${PRIVACY_EMAIL} and we'll work with RevenueCat to handle it. To stop seeing ads, subscribe to Premium. You can also reset your device's advertising ID in your phone's settings.`,
    ],
  },
  {
    heading: 'Children',
    paragraphs: ["Haystack is not meant for anyone under 18, and we don't knowingly collect data from children."],
  },
  {
    heading: 'Security',
    paragraphs: [
      "All network traffic is encrypted (HTTPS). Data on your phone is protected by your phone's own security, such as its passcode. No method is fully secure, but we review the app regularly for known vulnerabilities.",
    ],
  },
  {
    heading: 'Data outside Singapore',
    paragraphs: [
      'RevenueCat, Google, Supabase and Expo may process data outside Singapore, including in the United States. Where that happens we rely on their contractual protections to keep it to a standard comparable to the PDPA.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      "If we change this policy, we'll update the date at the top and, for significant changes, tell you in the app.",
    ],
  },
  {
    heading: 'Contact and Data Protection Officer',
    paragraphs: [`Data Protection Officer: ${OPERATOR_NAME}. Email: ${PRIVACY_EMAIL}.`],
  },
];

/** The policy as Markdown, for PRIVACY.md. */
export function privacyPolicyMarkdown(): string {
  const lines = [`# ${POLICY_TITLE}`, '', `Last updated: ${POLICY_UPDATED}`, ''];
  for (const s of PRIVACY_POLICY) {
    lines.push(`## ${s.heading}`, '');
    for (const p of s.paragraphs ?? []) lines.push(p, '');
    if (s.bullets) lines.push(...s.bullets.map((b) => `- ${b}`), '');
  }
  return lines.join('\n');
}
