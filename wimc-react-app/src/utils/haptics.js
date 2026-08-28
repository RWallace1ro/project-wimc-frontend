import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Real native haptic feedback (Taptic Engine on iOS, vibration motor on
// Android) via Capacitor's plugin — a genuine native capability, distinct
// from anything a web page running in a browser or WebView can trigger on
// its own. No-op on the public website. Every call is fire-and-forget and
// swallows errors — haptics are a nice-to-have polish, never something a
// user action should be blocked or slowed down by.
const NATIVE_PLATFORM = Capacitor.isNativePlatform();

export function hapticTap() {
  if (!NATIVE_PLATFORM) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function hapticSuccess() {
  if (!NATIVE_PLATFORM) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export function hapticError() {
  if (!NATIVE_PLATFORM) return;
  Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}
