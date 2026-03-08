import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// ===== AD UNIT IDS =====
const AD_IDS = {
  INTERSTITIAL: 'ca-app-pub-6881903056221433/4467847981',
  REWARDED: 'ca-app-pub-6881903056221433/2935420254',
};

// Gunakan test ads saat development
const USE_TEST_ADS = __DEV__;

const getInterstitialId = () =>
  USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_IDS.INTERSTITIAL;

const getRewardedId = () =>
  USE_TEST_ADS ? TestIds.REWARDED : AD_IDS.REWARDED;

// ===== INTERSTITIAL AD =====

let interstitialAd: InterstitialAd | null = null;
let interstitialLoaded = false;

function createInterstitial() {
  if (interstitialAd) {
    try { interstitialAd.removeAllListeners(); } catch (_) {}
  }

  interstitialAd = InterstitialAd.createForAdRequest(getInterstitialId(), {
    requestNonPersonalizedAdsOnly: true,
  });

  const unsubLoad = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
    console.log('[AdMob] Interstitial loaded');
  });

  const unsubClose = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    setTimeout(() => createInterstitial(), 1000);
  });

  const unsubError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
    interstitialLoaded = false;
    console.log('[AdMob] Interstitial error:', error);
    setTimeout(() => createInterstitial(), 30000);
  });

  interstitialAd.load();
}

export function showInterstitial(): Promise<boolean> {
  return new Promise((resolve) => {
    if (interstitialLoaded && interstitialAd) {
      interstitialAd.show().catch(() => resolve(false));
      resolve(true);
    } else {
      console.log('[AdMob] Interstitial not ready');
      resolve(false);
    }
  });
}

// ===== REWARDED AD =====

let rewardedAd: RewardedAd | null = null;
let rewardedLoaded = false;
let isShowingRewarded = false;

function createRewarded() {
  if (rewardedAd) {
    try { rewardedAd.removeAllListeners(); } catch (_) {}
  }

  rewardedAd = RewardedAd.createForAdRequest(getRewardedId(), {
    requestNonPersonalizedAdsOnly: true,
  });

  rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
    console.log('[AdMob] Rewarded loaded');
  });

  rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    rewardedLoaded = false;
    console.log('[AdMob] Rewarded error:', error);
    // Only auto-retry if not currently showing
    if (!isShowingRewarded) {
      setTimeout(() => createRewarded(), 30000);
    }
  });

  rewardedAd.load();
}

export function showRewarded(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewardedLoaded || !rewardedAd) {
      console.log('[AdMob] Rewarded not ready');
      resolve(false);
      return;
    }

    let rewarded = false;
    let resolved = false;
    isShowingRewarded = true;

    const safeResolve = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        isShowingRewarded = false;
        resolve(value);
      }
    };

    // Listen for reward earned
    const unsubReward = rewardedAd!.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        rewarded = true;
        console.log('[AdMob] User earned reward:', reward);
      }
    );

    // Listen for ad closed — resolve here so we know final state
    const unsubClose = rewardedAd!.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        try { unsubReward(); } catch (_) {}
        try { unsubClose(); } catch (_) {}
        rewardedLoaded = false;
        safeResolve(rewarded);
        // Reload next ad
        setTimeout(() => createRewarded(), 1000);
      }
    );

    rewardedAd!.show().catch((err) => {
      console.log('[AdMob] Rewarded show error:', err);
      try { unsubReward(); } catch (_) {}
      try { unsubClose(); } catch (_) {}
      rewardedLoaded = false;
      safeResolve(false);
      setTimeout(() => createRewarded(), 5000);
    });

    // Safety timeout — if ad doesn't close within 60s, resolve false
    setTimeout(() => {
      safeResolve(false);
    }, 60000);
  });
}

// ===== INIT =====

export function initAdMob() {
  console.log('[AdMob] Initializing...');
  console.log('[AdMob] Using test ads:', USE_TEST_ADS);
  createInterstitial();
  createRewarded();
}

export function isRewardedReady() {
  return rewardedLoaded && !isShowingRewarded;
}

export function isInterstitialReady() {
  return interstitialLoaded;
}

/** Force reload rewarded ad (e.g. after failed attempt) */
export function reloadRewarded() {
  if (!rewardedLoaded && !isShowingRewarded) {
    createRewarded();
  }
}
