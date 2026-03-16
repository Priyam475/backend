import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { PushNotifications } from '@capacitor/push-notifications';

export { NotificationType };

/** True when running inside a native Capacitor shell (Android/iOS) */
export const isNative = Capacitor.isNativePlatform();

/* ───── Camera ───── */

export async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });
  return image;
}

export async function pickFromGallery() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
  });
  return image;
}

/* ───── Haptics ───── */

export async function hapticImpact(style: ImpactStyle = ImpactStyle.Medium) {
  if (!isNative) return;
  await Haptics.impact({ style });
}

export async function hapticNotification(type: NotificationType = NotificationType.Success) {
  if (!isNative) return;
  await Haptics.notification({ type });
}

export async function hapticVibrate() {
  if (!isNative) return;
  await Haptics.vibrate();
}

/** Light impact for list/selection taps (native only). */
export async function hapticSelection() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

/* ───── Keyboard (native only) ───── */

/** Hide the native keyboard. No-op on web. Use after selecting from list so UI is visible. */
export async function hideNativeKeyboard() {
  if (!isNative) return;
  try {
    await Keyboard.hide();
  } catch {
    // ignore if plugin unavailable
  }
}

/* ───── Push Notifications ───── */

export async function registerPushNotifications() {
  if (!isNative) return;

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.warn('Push notification permission not granted');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration token:', token.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error:', err.error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action:', notification);
  });
}
