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

// Set to true during development to use test ads
const USE_TEST_ADS = __DEV__;

const getInterstitialId = () =>
  USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_IDS.INTERSTITIAL;

const getRewardedId = () =>
  USE_TEST_ADS ? TestIds.REWARDED : AD_IDS.REWARDED;

// ===== INTERSTITIAL AD =====

let interstitialAd: InterstitialAd | null = null;
let interstitialLoaded = false;

export function loadInterstitial() {
  interstitialAd = InterstitialAd.createForAdRequest(getInterstitialId(), {
    requestNonPersonalizedAdsOnly: true,
  });

  interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
    console.log('[AdMob] Interstitial loaded');
  });

  interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    // Auto-reload after closed
    loadInterstitial();
  });

  interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
    interstitialLoaded = false;
    console.log('[AdMob] Interstitial error:', error);
    // Retry after 30s
    setTimeout(loadInterstitial, 30000);
  });

  interstitialAd.load();
}

export function showInterstitial(): Promise<boolean> {
  return new Promise((resolve) => {
    if (interstitialLoaded && interstitialAd) {
      interstitialAd.show();
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

export function loadRewarded() {
  rewardedAd = RewardedAd.createForAdRequest(getRewardedId(), {
    requestNonPersonalizedAdsOnly: true,
  });

  rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
    console.log('[AdMob] Rewarded loaded');
  });

  rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
    console.log('[AdMob] User earned reward:', reward);
  });

  rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    loadRewarded();
  });

  rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    rewardedLoaded = false;
    console.log('[AdMob] Rewarded error:', error);
    setTimeout(loadRewarded, 30000);
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

    // Listen for reward earned
    const unsubReward = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        unsubReward();
        resolve(true);
      }
    );

    // Listen for close without reward
    const unsubClose = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubClose();
        // resolve(false) only if reward wasn't given
        // The EARNED_REWARD fires before CLOSED, so this is a fallback
      }
    );

    rewardedAd.show();
  });
}

// ===== INIT =====

export function initAdMob() {
  console.log('[AdMob] Initializing...');
  console.log('[AdMob] Using test ads:', USE_TEST_ADS);
  loadInterstitial();
  loadRewarded();
}

export function isRewardedReady() {
  return rewardedLoaded;
}

export function isInterstitialReady() {
  return interstitialLoaded;
}
