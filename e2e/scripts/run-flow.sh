#!/usr/bin/env bash
# Runs one Maestro flow. If it fails, prints what was on screen at that moment
# and the app's recent JS logs, so CI logs show the cause without screenshots.
# Usage: e2e/scripts/run-flow.sh <flow-name>
set -u
flow="$1"

# Android: an emulator is attached. iOS: a simulator is booted. Only the device
# setup and log commands differ; the flow itself is the same on both.
if command -v adb >/dev/null && adb get-state >/dev/null 2>&1; then android=1; else android=0; fi

# A freshly booted CI emulator sometimes shows "System isn't responding" dialogs
# over the app. They're about the emulator, not the app, so hide them.
[ "$android" = 1 ] && { adb shell settings put global hide_error_dialogs 1 || true; }

maestro test "e2e/flows/$flow.yaml" --format junit --output "e2e-$flow.xml" && exit 0

echo "::group::On screen when $flow failed (id | text)"
maestro hierarchy 2>/dev/null |
  jq -r '.. | objects | .attributes? // empty
    | [.["resource-id"], .text, .accessibilityText, .bounds] | map(select(. != null and . != "")) | select(length > 0)
    | join(" | ")' || echo "Could not read the screen."
echo "::endgroup::"
echo "::group::Recent app logs"
if [ "$android" = 1 ]; then
  adb logcat -d -s ReactNativeJS:V AndroidRuntime:E | tail -n 100
else
  xcrun simctl spawn booted log show --last 2m --style compact --predicate 'process == "Swipe"' | tail -n 100
fi
echo "::endgroup::"
exit 1
