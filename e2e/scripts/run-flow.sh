#!/usr/bin/env bash
# Runs one Maestro flow. If it fails, prints what was on screen at that moment
# and the app's recent JS logs, so CI logs show the cause without screenshots.
# Usage: e2e/scripts/run-flow.sh <flow-name>
set -u
flow="$1"

# A freshly booted CI emulator sometimes shows "System isn't responding" dialogs
# over the app. They're about the emulator, not the app, so hide them.
adb shell settings put global hide_error_dialogs 1 || true

maestro test "e2e/flows/$flow.yaml" --format junit --output "e2e-$flow.xml" && exit 0

echo "::group::On screen when $flow failed (id | text)"
maestro hierarchy 2>/dev/null |
  jq -r '.. | objects | .attributes? // empty
    | [.["resource-id"], .text, .accessibilityText, .bounds] | map(select(. != null and . != "")) | select(length > 0)
    | join(" | ")' || echo "Could not read the screen."
echo "::endgroup::"
echo "::group::Recent app logs"
adb logcat -d -s ReactNativeJS:V AndroidRuntime:E | tail -n 100
echo "::endgroup::"
exit 1
