import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Banner, BannerPlacement } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let banners: Banner[] = [];
    let settings = { autoSlideInterval: 4000, isEnabled: true };

    // Try Supabase first if table exists, else fallback to db
    try {
      const { data: dbBanners, error } = await supabaseAdmin
        .from('Banner')
        .select('*')
        .order('order', { ascending: true });

      if (!error && dbBanners && dbBanners.length > 0) {
        banners = dbBanners as Banner[];
      }
    } catch {}

    if (banners.length === 0) {
      banners = db.getBanners();
      settings = db.getBannerSettings();
    }

    // Try to load site settings for banner speed if configured
    try {
      const { data: siteSettingsData } = await supabaseAdmin
        .from('SiteSettings')
        .select('*')
        .eq('key', 'banner_slide_speed')
        .maybeSingle();

      if (siteSettingsData?.value) {
        const speed = parseInt(siteSettingsData.value, 10);
        if (!isNaN(speed) && speed > 0) {
          settings.autoSlideInterval = speed;
        }
      }
    } catch {}

    const activeBanners = all ? banners : banners.filter((b) => b.isActive);

    const mainSliders = activeBanners.filter((b) => b.placement === 'MAIN_SLIDER');
    const sideTop = activeBanners.find((b) => b.placement === 'SIDE_TOP') || null;
    const sideBottom = activeBanners.find((b) => b.placement === 'SIDE_BOTTOM') || null;

    return NextResponse.json({
      success: true,
      banners: activeBanners,
      settings,
      mainSliders,
      sideTop,
      sideBottom,
    });
  } catch (error: any) {
    console.error('[GET /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch banners.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'UPDATE_SETTINGS') {
      const { autoSlideInterval, isEnabled } = body;
      const updated = db.updateBannerSettings({ autoSlideInterval, isEnabled });

      try {
        await supabaseAdmin
          .from('SiteSettings')
          .upsert({
            key: 'banner_slide_speed',
            value: String(autoSlideInterval || 4000),
            updatedAt: new Date().toISOString(),
          });
      } catch {}

      return NextResponse.json({ success: true, settings: updated });
    }

    const { title, subtitle, badge, imageUrl, linkUrl, buttonText, placement, order, isActive } = body;

    if (!title || !imageUrl) {
      return NextResponse.json({ message: 'Title and image URL are required.' }, { status: 400 });
    }

    const newBannerData: Omit<Banner, 'id' | 'createdAt'> = {
      title,
      subtitle: subtitle || '',
      badge: badge || '',
      imageUrl,
      linkUrl: linkUrl || '/tournaments',
      buttonText: buttonText || 'JOIN TOURNAMENT',
      placement: (placement as BannerPlacement) || 'MAIN_SLIDER',
      order: Number(order || 1),
      isActive: isActive ?? true,
    };

    const newBanner = db.createBanner(newBannerData);

    try {
      await supabaseAdmin.from('Banner').insert(newBanner);
    } catch {}

    return NextResponse.json({ success: true, banner: newBanner });
  } catch (error: any) {
    console.error('[POST /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create banner.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: 'Banner ID is required.' }, { status: 400 });
    }

    const updated = db.updateBanner(id, updates);
    if (!updated) {
      return NextResponse.json({ message: 'Banner not found.' }, { status: 404 });
    }

    try {
      await supabaseAdmin
        .from('Banner')
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq('id', id);
    } catch {}

    return NextResponse.json({ success: true, banner: updated });
  } catch (error: any) {
    console.error('[PUT /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update banner.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Banner ID is required.' }, { status: 400 });
    }

    const deleted = db.deleteBanner(id);

    try {
      await supabaseAdmin.from('Banner').delete().eq('id', id);
    } catch {}

    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error('[DELETE /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete banner.' }, { status: 500 });
  }
}
