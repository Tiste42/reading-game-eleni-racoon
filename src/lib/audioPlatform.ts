export interface AudioPlatformIdentity {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

/**
 * iPadOS can identify itself as macOS, so touch capability is part of the
 * check. Apple mobile browsers all use WebKit, including installed PWAs.
 */
export function isAppleMobilePlatform(identity: AudioPlatformIdentity): boolean {
  return /iPad|iPhone|iPod/i.test(identity.userAgent) ||
    (/Mac/i.test(identity.platform) && identity.maxTouchPoints > 1);
}

export function shouldUseNativeMediaAudio(): boolean {
  if (typeof navigator === 'undefined') return false;

  return isAppleMobilePlatform({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  });
}
