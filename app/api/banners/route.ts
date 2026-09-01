import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Banner, BannerPlacement } from '@/lib/types';
import { initialBanners } from '@/lib/mock-data';
import { supabaseAdmin } from '@/lib/supabase';
import { saveBase64Image } from '@/lib/upload';

export const dynamic = 'force-dynamic';

// Helper to sanitize standard Banner columns for the SQL table
function sanitizeSqlBanner(b: Banner): Record<string, any> {
  return {
    id: b.id,
    title: b.title || '',
    subtitle: b.subtitle || '',
    badge: b.badge || b.badgeText || '',
    imageUrl: b.imageUrl || '',
    linkUrl: b.linkUrl || b.link || '/tournaments',
    buttonText: b.buttonText || '',
    placement: b.placement || 'MAIN_SLIDER',
    order: Number(b.order ?? b.displayOrder ?? 1),
    isActive: b.isActive !== false,
    createdAt: b.createdAt || new Date().toISOString(),
    updatedAt: b.updatedAt || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let banners: Banner[] = [];
    let settings: { autoSlideInterval: number; isEnabled: boolean; overlayOpacity: number } = { 
      autoSlideInterval: 4000, 
      isEnabled: true,
      overlayOpacity: 50
    };

    // 1. Try Supabase Banner table first
    try {
      const { data: dbBanners, error } = await supabaseAdmin
        .from('Banner')
        .select('*')
        .order('order', { ascending: true });

      if (!error && dbBanners && dbBanners.length > 0) {
        banners = dbBanners as Banner[];
      }
    } catch (e) {
      console.warn('[GET /api/banners] Supabase fetch error:', e);
    }

    // 2. Load Extended Shop Banners from SiteSetting
    let customShopBanners: Banner[] | null = null;
    try {
      const { data: siteSettingsData } = await supabaseAdmin
        .from('SiteSetting')
        .select('key, value')
        .in('key', ['site_shop_banners', 'banner_slide_speed', 'shop_banner_slide_speed', 'banner_overlay_opacity']);

      if (siteSettingsData && siteSettingsData.length > 0) {
        siteSettingsData.forEach((setting) => {
          if (setting.key === 'site_shop_banners' && setting.value) {
            try {
              const parsed = JSON.parse(setting.value);
              if (Array.isArray(parsed) && parsed.length > 0) {
                customShopBanners = parsed;
              }
            } catch {}
          }
          if (setting.key === 'banner_slide_speed' || setting.key === 'shop_banner_slide_speed') {
            const speed = parseInt(setting.value, 10);
            if (!isNaN(speed) && speed > 0) {
              settings.autoSlideInterval = speed;
            }
          }
          if (setting.key === 'banner_overlay_opacity') {
            const opacity = parseInt(setting.value, 10);
            if (!isNaN(opacity) && opacity >= 0 && opacity <= 100) {
              settings.overlayOpacity = opacity;
            }
          }
        });
      }
    } catch {}

    // Auto-seed initial banners if table is currently empty
    if (banners.length === 0 && !customShopBanners) {
      try {
        const seededBanners = initialBanners.map((b) => ({
          ...b,
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: b.updatedAt || new Date().toISOString(),
        }));

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('Banner')
          .upsert(seededBanners.map(sanitizeSqlBanner), { onConflict: 'id' })
          .select();

        if (!insertErr && inserted && inserted.length > 0) {
          banners = inserted as Banner[];
        }
      } catch (seedErr) {
        console.warn('[GET /api/banners] Auto-seed failed:', seedErr);
      }

      if (banners.length === 0) {
        banners = db.getBanners();
        settings = { ...settings, ...db.getBannerSettings() };
      }
    }

    // Merge custom shop banners if found in SiteSetting
    if (customShopBanners && (customShopBanners as Banner[]).length > 0) {
      // Filter out old shop banners from table and replace with custom ones
      const nonShop = banners.filter((b) => b.placement !== 'SHOP_BANNER');
      banners = [...nonShop, ...(customShopBanners as Banner[])].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    const activeBanners = all ? banners : banners.filter((b) => b.isActive);

    const mainSliders = activeBanners.filter((b) => b.placement === 'MAIN_SLIDER');
    const sideTop = activeBanners.find((b) => b.placement === 'SIDE_TOP') || null;
    const sideBottom = activeBanners.find((b) => b.placement === 'SIDE_BOTTOM') || null;
    const shopBanners = activeBanners.filter((b) => b.placement === 'SHOP_BANNER');
    const shopBanner = shopBanners[0] || null;
    const arenaBanner = activeBanners.find((b) => b.placement === 'ARENA_BANNER') || null;

    return NextResponse.json(
      {
        success: true,
        banners: activeBanners,
        settings,
        mainSliders,
        sideTop,
        sideBottom,
        shopBanner,
        shopBanners,
        arenaBanner,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch banners.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Update Global Settings
    if (body.action === 'UPDATE_SETTINGS') {
      const { autoSlideInterval, isEnabled, overlayOpacity } = body;
      const updated = db.updateBannerSettings({ autoSlideInterval, isEnabled, overlayOpacity });

      try {
        await supabaseAdmin
          .from('SiteSetting')
          .upsert([
            {
              id: 'setting_banner_slide_speed',
              key: 'banner_slide_speed',
              value: String(autoSlideInterval || 4000),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'setting_shop_banner_slide_speed',
              key: 'shop_banner_slide_speed',
              value: String(autoSlideInterval || 4000),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'setting_banner_overlay_opacity',
              key: 'banner_overlay_opacity',
              value: String(overlayOpacity ?? 50),
              updatedAt: new Date().toISOString(),
            }
          ], { onConflict: 'key' });
      } catch {}

      return NextResponse.json({ success: true, settings: updated });
    }

    // 2. Handle Shop Banners array or single banner item
    const bannerItem = body.shopBanner || body;
    const { title, subtitle, badge, badgeText, imageUrl, mobileImageUrl, targetDevice, linkUrl, link, buttonText, placement, order, displayOrder, isActive } = bannerItem;

    if (!imageUrl) {
      return NextResponse.json({ message: 'Desktop Banner Image is required.' }, { status: 400 });
    }

    // Upload base64 images to Supabase Storage if uploaded from device
    let finalImageUrl = imageUrl;
    if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
      try {
        const uploadedUrl = await saveBase64Image(imageUrl, 'banner');
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      } catch (uploadErr) {
        console.error('[POST /api/banners] Base64 upload failed, using fallback:', uploadErr);
      }
    }

    let finalMobileImageUrl = mobileImageUrl || '';
    if (typeof finalMobileImageUrl === 'string' && finalMobileImageUrl.startsWith('data:image/')) {
      try {
        const uploadedUrl = await saveBase64Image(finalMobileImageUrl, 'banner_mobile');
        if (uploadedUrl) finalMobileImageUrl = uploadedUrl;
      } catch (uploadErr) {
        console.error('[POST /api/banners] Mobile base64 upload failed:', uploadErr);
      }
    }

    const newBannerId = bannerItem.id || `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const bannerObj: Banner = {
      id: newBannerId,
      title: (title || '').trim(),
      subtitle: (subtitle || '').trim(),
      badge: (badge || badgeText || '').trim(),
      badgeText: (badgeText || badge || '').trim(),
      imageUrl: finalImageUrl,
      mobileImageUrl: finalMobileImageUrl || undefined,
      targetDevice: targetDevice || 'ALL',
      linkUrl: linkUrl || link || (placement === 'SHOP_BANNER' ? '/shop' : '/tournaments'),
      link: link || linkUrl || (placement === 'SHOP_BANNER' ? '/shop' : '/tournaments'),
      buttonText: (buttonText || '').trim(),
      placement: (placement as BannerPlacement) || 'SHOP_BANNER',
      order: Number(order ?? displayOrder ?? 1),
      displayOrder: Number(displayOrder ?? order ?? 1),
      isActive: isActive !== false,
      createdAt: bannerItem.createdAt || now,
      updatedAt: now,
    };

    // Save to in-memory db
    db.createBanner(bannerObj);

    // Save to SQL Banner table (sanitized)
    try {
      await supabaseAdmin
        .from('Banner')
        .upsert(sanitizeSqlBanner(bannerObj), { onConflict: 'id' });
    } catch (e) {
      console.warn('[POST /api/banners] Supabase SQL table insert warning:', e);
    }

    // If this is a SHOP_BANNER, sync into SiteSetting 'site_shop_banners'
    if (bannerObj.placement === 'SHOP_BANNER') {
      try {
        const { data: existingSetting } = await supabaseAdmin
          .from('SiteSetting')
          .select('value')
          .eq('key', 'site_shop_banners')
          .maybeSingle();

        let currentList: Banner[] = [];
        if (existingSetting?.value) {
          try {
            currentList = JSON.parse(existingSetting.value);
          } catch {}
        }

        const existingIdx = currentList.findIndex((b) => b.id === bannerObj.id);
        if (existingIdx >= 0) {
          currentList[existingIdx] = bannerObj;
        } else {
          currentList.push(bannerObj);
        }

        currentList.sort((a, b) => (a.order || 0) - (b.order || 0));

        await supabaseAdmin
          .from('SiteSetting')
          .upsert({
            id: 'setting_site_shop_banners',
            key: 'site_shop_banners',
            value: JSON.stringify(currentList),
            updatedAt: now,
          }, { onConflict: 'key' });
      } catch (siteErr) {
        console.warn('[POST /api/banners] SiteSetting shop banners sync error:', siteErr);
      }
    }

    // Also save slide interval if passed
    if (body.settings?.autoSlideInterval) {
      try {
        await supabaseAdmin
          .from('SiteSetting')
          .upsert([
            {
              id: 'setting_shop_banner_slide_speed',
              key: 'shop_banner_slide_speed',
              value: String(body.settings.autoSlideInterval),
              updatedAt: now,
            },
            {
              id: 'setting_banner_slide_speed',
              key: 'banner_slide_speed',
              value: String(body.settings.autoSlideInterval),
              updatedAt: now,
            }
          ], { onConflict: 'key' });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Banner saved successfully!',
      banner: bannerObj,
      shopBanner: bannerObj,
    });
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

    // Upload base64 image to Supabase Storage if uploaded from device
    if (typeof updates.imageUrl === 'string' && updates.imageUrl.startsWith('data:image/')) {
      try {
        const uploadedUrl = await saveBase64Image(updates.imageUrl, 'banner');
        if (uploadedUrl) updates.imageUrl = uploadedUrl;
      } catch (uploadErr) {
        console.error('[PUT /api/banners] Base64 upload failed:', uploadErr);
      }
    }

    if (typeof updates.mobileImageUrl === 'string' && updates.mobileImageUrl.startsWith('data:image/')) {
      try {
        const uploadedUrl = await saveBase64Image(updates.mobileImageUrl, 'banner_mobile');
        if (uploadedUrl) updates.mobileImageUrl = uploadedUrl;
      } catch (uploadErr) {
        console.error('[PUT /api/banners] Mobile base64 upload failed:', uploadErr);
      }
    }

    const now = new Date().toISOString();

    // 1. Update in-memory db
    db.updateBanner(id, updates);

    // 2. Fetch existing and construct full updated banner
    const existing = db.getBannerById(id) || initialBanners.find((b) => b.id === id);
    const fullBanner: Banner = {
      id,
      title: updates.title !== undefined ? updates.title : (existing?.title || ''),
      subtitle: updates.subtitle !== undefined ? updates.subtitle : (existing?.subtitle || ''),
      badge: updates.badge !== undefined ? updates.badge : (existing?.badge || ''),
      badgeText: updates.badgeText !== undefined ? updates.badgeText : (existing?.badgeText || updates.badge || existing?.badge || ''),
      imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : (existing?.imageUrl || ''),
      mobileImageUrl: updates.mobileImageUrl !== undefined ? updates.mobileImageUrl : existing?.mobileImageUrl,
      targetDevice: (updates.targetDevice || existing?.targetDevice || 'ALL') as 'ALL' | 'DESKTOP' | 'MOBILE',
      linkUrl: updates.linkUrl || updates.link || existing?.linkUrl || '/tournaments',
      link: updates.link || updates.linkUrl || existing?.link || '/tournaments',
      buttonText: updates.buttonText !== undefined ? updates.buttonText : (existing?.buttonText || ''),
      placement: (updates.placement || existing?.placement || 'MAIN_SLIDER') as BannerPlacement,
      order: Number(updates.order ?? existing?.order ?? 1),
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : (existing?.isActive ?? true),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    // 3. Update Supabase SQL Banner Table (sanitized)
    try {
      await supabaseAdmin
        .from('Banner')
        .upsert(sanitizeSqlBanner(fullBanner), { onConflict: 'id' });
    } catch (e) {
      console.warn('[PUT /api/banners] Supabase update warning:', e);
    }

    // 4. If this is a SHOP_BANNER or belongs to shop banners, update SiteSetting 'site_shop_banners'
    try {
      const { data: existingSetting } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', 'site_shop_banners')
        .maybeSingle();

      let currentList: Banner[] = [];
      if (existingSetting?.value) {
        try {
          currentList = JSON.parse(existingSetting.value);
        } catch {}
      }

      const idx = currentList.findIndex((b) => b.id === id);
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...fullBanner };
      } else if (fullBanner.placement === 'SHOP_BANNER') {
        currentList.push(fullBanner);
      }

      currentList.sort((a, b) => (a.order || 0) - (b.order || 0));

      await supabaseAdmin
        .from('SiteSetting')
        .upsert({
          id: 'setting_site_shop_banners',
          key: 'site_shop_banners',
          value: JSON.stringify(currentList),
          updatedAt: now,
        }, { onConflict: 'key' });
    } catch (siteErr) {
      console.warn('[PUT /api/banners] SiteSetting shop banner sync error:', siteErr);
    }

    return NextResponse.json({ success: true, banner: fullBanner });
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

    db.deleteBanner(id);

    try {
      await supabaseAdmin.from('Banner').delete().eq('id', id);
    } catch (e) {
      console.warn('[DELETE /api/banners] Supabase delete warning:', e);
    }

    // Also remove from SiteSetting 'site_shop_banners'
    try {
      const { data: existingSetting } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', 'site_shop_banners')
        .maybeSingle();

      if (existingSetting?.value) {
        let currentList: Banner[] = [];
        try {
          currentList = JSON.parse(existingSetting.value);
        } catch {}
        const filtered = currentList.filter((b) => b.id !== id);

        await supabaseAdmin
          .from('SiteSetting')
          .upsert({
            id: 'setting_site_shop_banners',
            key: 'site_shop_banners',
            value: JSON.stringify(filtered),
            updatedAt: new Date().toISOString(),
          }, { onConflict: 'key' });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete banner.' }, { status: 500 });
  }
}
