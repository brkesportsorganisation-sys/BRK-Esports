import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ad_settings')
      .maybeSingle();

    if (error) {
      console.warn('[GET /api/ads] Supabase warning:', error.message);
    }

    let adSettings = {
      isActive: true,
      ads: [
        {
          id: 'ad_ff_1',
          videoId: '7Y4lFvP9gZc', // Free Fire Esports Tournament Highlights
          title: 'Free Fire World Series - Final Clutch & Booyah Highlights',
          rewardAmount: 10,
          isActive: true
        },
        {
          id: 'ad_ff_2',
          videoId: 'YOUTUBE_AD_2',
          title: 'Pro Free Fire Grand Finals - Best Headshots & Strategy',
          rewardAmount: 15,
          isActive: true
        },
        {
          id: 'ad_ff_3',
          videoId: 'YOUTUBE_AD_3',
          title: 'Top 10 Rusher Tactics for BR Ranked Mode',
          rewardAmount: 10,
          isActive: true
        }
      ]
    };

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (parsed && typeof parsed === 'object') {
          adSettings = {
            isActive: parsed.isActive ?? true,
            ads: (parsed.ads && parsed.ads.length > 0) ? parsed.ads : adSettings.ads,
          };
        }
      } catch (parseErr) {
        console.warn('[GET /api/ads] Failed to parse ad_settings JSON:', parseErr);
      }
    }

    return NextResponse.json({
      success: true,
      adSettings
    });
  } catch (error: any) {
    console.error('[GET /api/ads]', error);
    return NextResponse.json({ 
      success: false, 
      adSettings: {
        isActive: true,
        ads: [
          { id: 'ad_default', videoId: '7Y4lFvP9gZc', title: 'Free Fire Highlights', rewardAmount: 10, isActive: true }
        ]
      }
    });
  }
}
