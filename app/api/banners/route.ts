import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Banner, BannerPlacement } from '@/lib/types';
import { initialBanners } from '@/lib/mock-data';
import { supabaseAdmin } from '@/lib/supabase';
import { saveBase64Image } from '@/lib/upload';

export const dynamic = 'force-dynamic';

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

    // Try Supabase first
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

    // Auto-seed initial banners if table is currently empty
    if (banners.length === 0) {
      try {
        const seededBanners = initialBanners.map((b) => ({
          ...b,
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: b.updatedAt || new Date().toISOString(),
        }));

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('Banner')
          .upsert(seededBanners, { onConflict: 'id' })
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

    // Try to load site settings for banner speed if configured
    try {
      const { data: siteSettingsData } = await supabaseAdmin
        .from('SiteSetting')
        .select('key, value')
        .in('key', ['banner_slide_speed', 'banner_overlay_opacity']);

      if (siteSettingsData && siteSettingsData.length > 0) {
        siteSettingsData.forEach((setting) => {
          if (setting.key === 'banner_slide_speed') {
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

    const activeBanners = all ? banners : banners.filter((b) => b.isActive);

    const mainSliders = activeBanners.filter((b) => b.placement === 'MAIN_SLIDER');
    const sideTop = activeBanners.find((b) => b.placement === 'SIDE_TOP') || null;
    const sideBottom = activeBanners.find((b) => b.placement === 'SIDE_BOTTOM') || null;
    const shopBanners = activeBanners.filter((b) => b.placement === 'SHOP_BANNER');
    const shopBanner = shopBanners[0] || null;
    const arenaBanner = activeBanners.find((b) => b.placement === 'ARENA_BANNER') || null;

    return NextResponse.json({
      success: true,
      banners: activeBanners,
      settings,
      mainSliders,
      sideTop,
      sideBottom,
      shopBanner,
      shopBanners,
      arenaBanner,
    });
  } catch (error: any) {
    console.error('[GET /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch banners.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Support saving shop banner from /admin/shop/banners
    if (body.shopBanner || body.shopBanners) {
      const bannerItem = body.shopBanner || (Array.isArray(body.shopBanners) ? body.shopBanners[0] : null);
      if (!bannerItem) {
        return NextResponse.json({ message: 'Shop banner data is required.' }, { status: 400 });
      }

      let finalImageUrl = bannerItem.imageUrl || '';
      if (typeof finalImageUrl === 'string' && finalImageUrl.startsWith('data:image/')) {
        try {
          const uploadedUrl = await saveBase64Image(finalImageUrl, 'banner');
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.error('[POST /api/banners] Base64 upload failed:', uploadErr);
        }
      }

      const bannerId = bannerItem.id || 'shop_banner_hero';
      const now = new Date().toISOString();
      const shopBannerObj: Banner = {
        id: bannerId,
        title: (bannerItem.title || 'OFFICIAL GAMING TOP-UP & DIAMOND SHOP').trim(),
        subtitle: (bannerItem.subtitle || '').trim(),
        badge: (bannerItem.badge || bannerItem.badgeText || '').trim(),
        badgeText: (bannerItem.badgeText || bannerItem.badge || '').trim(),
        imageUrl: finalImageUrl,
        linkUrl: bannerItem.linkUrl || bannerItem.link || '/shop',
        link: bannerItem.link || bannerItem.linkUrl || '/shop',
        buttonText: bannerItem.buttonText || 'SHOP PACKAGES NOW',
        placement: 'SHOP_BANNER',
        order: Number(bannerItem.order || bannerItem.displayOrder || 1),
        displayOrder: Number(bannerItem.displayOrder || bannerItem.order || 1),
        isActive: bannerItem.isActive ?? true,
        createdAt: bannerItem.createdAt || now,
        updatedAt: now,
      };

      // Save to in-memory db
      db.updateBanner(bannerId, shopBannerObj);

      // Save to Supabase Banner table
      try {
        await supabaseAdmin
          .from('Banner')
          .upsert(shopBannerObj, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('[POST /api/banners] Shop banner upsert error:', dbErr);
      }

      // Also save slide settings if passed
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
        message: 'Shop banner saved successfully!',
        shopBanner: shopBannerObj,
        banner: shopBannerObj,
      });
    }

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
              id: 'setting_banner_overlay_opacity',
              key: 'banner_overlay_opacity',
              value: String(overlayOpacity ?? 50),
              updatedAt: new Date().toISOString(),
            }
          ], { onConflict: 'key' });
      } catch {}

      return NextResponse.json({ success: true, settings: updated });
    }

    const { title, subtitle, badge, imageUrl, linkUrl, buttonText, placement, order, isActive } = body;

    if (!title || !imageUrl) {
      return NextResponse.json({ message: 'Title and image URL are required.' }, { status: 400 });
    }

    // Upload base64 image to Supabase Storage if uploaded from device
    let finalImageUrl = imageUrl;
    if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
      try {
        const uploadedUrl = await saveBase64Image(imageUrl, 'banner');
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      } catch (uploadErr) {
        console.error('[POST /api/banners] Base64 upload failed, using fallback:', uploadErr);
      }
    }

    const newBannerId = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newBanner: Banner = {
      id: newBannerId,
      title: title.trim(),
      subtitle: (subtitle || '').trim(),
      badge: (badge || '').trim(),
      imageUrl: finalImageUrl,
      linkUrl: linkUrl || '/tournaments',
      buttonText: buttonText || 'JOIN TOURNAMENT',
      placement: (placement as BannerPlacement) || 'MAIN_SLIDER',
      order: Number(order || 1),
      isActive: isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    db.createBanner(newBanner);

    try {
      const { data: saved, error: dbErr } = await supabaseAdmin
        .from('Banner')
        .upsert(newBanner, { onConflict: 'id' })
        .select()
        .single();

      if (!dbErr && saved) {
        return NextResponse.json({ success: true, banner: saved });
      }
    } catch (e) {
      console.warn('[POST /api/banners] Supabase insert warning:', e);
    }

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

    // Upload base64 image to Supabase Storage if uploaded from device
    if (typeof updates.imageUrl === 'string' && updates.imageUrl.startsWith('data:image/')) {
      try {
        const uploadedUrl = await saveBase64Image(updates.imageUrl, 'banner');
        if (uploadedUrl) {
          updates.imageUrl = uploadedUrl;
        }
      } catch (uploadErr) {
        console.error('[PUT /api/banners] Base64 upload failed:', uploadErr);
      }
    }

    const now = new Date().toISOString();
    const updatePayload = {
      ...updates,
      updatedAt: now,
    };

    // Update in-memory db
    db.updateBanner(id, updates);

    // 1. Try standard column-level UPDATE in Supabase first
    try {
      const { data: updatedData, error: updateErr } = await supabaseAdmin
        .from('Banner')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!updateErr && updatedData) {
        return NextResponse.json({ success: true, banner: updatedData });
      }

      // 2. If row was not found in Supabase table yet, build full banner object and UPSERT
      const existing = db.getBannerById(id) || initialBanners.find((b) => b.id === id);
      const fullBannerToUpsert: Banner = {
        id,
        title: updates.title || existing?.title || 'Banner',
        subtitle: updates.subtitle !== undefined ? updates.subtitle : (existing?.subtitle || ''),
        badge: updates.badge !== undefined ? updates.badge : (existing?.badge || ''),
        imageUrl: updates.imageUrl || existing?.imageUrl || '',
        linkUrl: updates.linkUrl || existing?.linkUrl || '/tournaments',
        buttonText: updates.buttonText || existing?.buttonText || 'JOIN TOURNAMENT',
        placement: (updates.placement || existing?.placement || 'MAIN_SLIDER') as BannerPlacement,
        order: Number(updates.order ?? existing?.order ?? 1),
        isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : (existing?.isActive ?? true),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      const { data: saved, error: dbErr } = await supabaseAdmin
        .from('Banner')
        .upsert(fullBannerToUpsert, { onConflict: 'id' })
        .select()
        .single();

      if (!dbErr && saved) {
        return NextResponse.json({ success: true, banner: saved });
      }
      if (dbErr) {
        console.warn('[PUT /api/banners] Supabase upsert error:', dbErr);
      }
    } catch (e) {
      console.warn('[PUT /api/banners] Supabase update warning:', e);
    }

    const fallbackBanner = db.getBannerById(id) || { id, ...updates, updatedAt: now };
    return NextResponse.json({ success: true, banner: fallbackBanner });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/banners]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete banner.' }, { status: 500 });
  }
}

