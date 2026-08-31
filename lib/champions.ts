import { supabaseAdmin } from './supabase';
import { ChampionsConfig, ChampionPodiumItem, HallOfFameSquad } from './types';

export const DEFAULT_CHAMPIONS_CONFIG: ChampionsConfig = {
  seasonTitle: 'Esports Champions & Legends',
  subtitle: 'Celebrating the top-performing Free Fire esports athletes and squads of the season. Compete in daily tournaments to earn your spot in the Hall of Fame!',
  bannerNotice: '👑 HALL OF FAME & MVP SHOWCASE',
  autoSyncLeaderboard: false,
  topPodiums: [
    {
      rank: 1,
      name: 'Tanvir Hossain',
      inGameName: 'EZBD・DEVIL亗',
      freeFireUid: '189283741',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
      earnings: 45200,
      totalWins: 38,
      totalKills: 312,
      headshotRate: '68.4%',
      badge: 'GRANDMASTER MVP',
      signatureWeapon: 'M1887 & AWM',
      seasonTitle: 'Season 1 Grandmaster MVP',
    },
    {
      rank: 2,
      name: 'Sabbir Ahmed',
      inGameName: 'BLACK・VIPER⚡',
      freeFireUid: '204918231',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      earnings: 32800,
      totalWins: 27,
      totalKills: 245,
      headshotRate: '61.2%',
      badge: 'SNIPER GOD',
      signatureWeapon: 'M82B & Desert Eagle',
      seasonTitle: 'Season 1 Sniper Legend',
    },
    {
      rank: 3,
      name: 'Rakib Hasan',
      inGameName: 'NOVA・KILLER࿐',
      freeFireUid: '193827162',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
      earnings: 24500,
      totalWins: 21,
      totalKills: 198,
      headshotRate: '57.8%',
      badge: 'RUSHER KING',
      signatureWeapon: 'MP40 & Woodpecker',
      seasonTitle: 'Season 1 Rusher King',
    },
  ],
  proAthletes: [
    {
      rank: 4,
      name: 'Tanvir Hossain',
      inGameName: 'EZBD・DEVIL亗',
      freeFireUid: '189283741',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
      earnings: 45200,
      totalWins: 38,
      totalKills: 312,
      headshotRate: '68.4%',
      badge: 'GRANDMASTER MVP',
      signatureWeapon: 'M1887 & AWM',
    },
    {
      rank: 5,
      name: 'Sabbir Ahmed',
      inGameName: 'BLACK・VIPER⚡',
      freeFireUid: '204918231',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      earnings: 32800,
      totalWins: 27,
      totalKills: 245,
      headshotRate: '61.2%',
      badge: 'SNIPER GOD',
      signatureWeapon: 'M82B & Desert Eagle',
    },
    {
      rank: 6,
      name: 'Rakib Hasan',
      inGameName: 'NOVA・KILLER࿐',
      freeFireUid: '193827162',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
      earnings: 24500,
      totalWins: 21,
      totalKills: 198,
      headshotRate: '57.8%',
      badge: 'RUSHER KING',
      signatureWeapon: 'MP40 & Woodpecker',
    },
  ],
  legendarySquads: [
    {
      id: 'sq_ezbd_elite',
      squadName: 'EZBD Elite',
      tag: 'EZBD',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
      captainName: 'EZBD・DEVIL亗',
      totalWins: 42,
      totalEarnings: 84000,
      titles: '🏆 3x BR Grand Champion • CS Knockout MVP Squad',
    },
    {
      id: 'sq_ocr_falcon',
      squadName: 'OCR Falcon Esports',
      tag: 'OCR',
      logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200',
      captainName: 'OCR・FALCON',
      totalWins: 31,
      totalEarnings: 62000,
      titles: '🥈 2x Runner-Up • Most Kills Squad of the Season',
    },
  ],
  updatedAt: new Date().toISOString(),
};

let inMemoryConfig: ChampionsConfig = DEFAULT_CHAMPIONS_CONFIG;

/**
 * Loads the current Hall of Champions config from Supabase.
 */
export async function getChampionsConfig(): Promise<ChampionsConfig> {
  try {
    const { data } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'EZBD_ESPORTS_CHAMPIONS')
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (parsed && typeof parsed === 'object') {
        inMemoryConfig = { ...DEFAULT_CHAMPIONS_CONFIG, ...parsed };
        return inMemoryConfig;
      }
    }
  } catch (err) {
    console.warn('[getChampionsConfig] Supabase fetch notice:', err);
  }

  return inMemoryConfig;
}

/**
 * Saves the Hall of Champions config directly to Supabase.
 */
export async function saveChampionsConfig(config: ChampionsConfig): Promise<boolean> {
  inMemoryConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        key: 'EZBD_ESPORTS_CHAMPIONS',
        value: JSON.stringify(inMemoryConfig),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[saveChampionsConfig] Supabase save error:', err);
    return false;
  }
}
