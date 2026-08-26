'use client';

import React, { useState, useEffect } from 'react';
import { 
  Diamond, 
  Search, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  Filter, 
  Coins, 
  DollarSign, 
  Gift, 
  Send,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  Tag,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  Crown,
  Ticket,
  Save,
  ArrowRight,
  UploadCloud,
  Upload
} from 'lucide-react';
import { ShopProduct, DEFAULT_SHOP_PRODUCTS } from '@/lib/types';

const compressImage = (file: File, maxWidth = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve(dataUrl);
        } catch {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

interface ShopOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  method: string;
  amount: number;
  trxId: string;
  status: string;
  notes: string;
  createdAt: string;
}

const PRESET_SHOP_IMAGES = [
  { name: 'Free Fire Diamonds 💎', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80' },
  { name: 'Neon Cyber Arena ⚡', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80' },
  { name: 'Dragon AK47 Skin 🔫', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80' },
  { name: 'VIP Tournament Pass 🎟️', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&auto=format&fit=crop&q=80' },
  { name: 'Level Up & Mystery Crate 📦', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80' },
];

export default function AdminGamingShopPage() {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'ORDERS' | 'BANNER'>('PRODUCTS');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCashRevenue: 0,
    totalCoinsSpent: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
  });

  // Shop Banner Customizer State
  const [shopBanner, setShopBanner] = useState<{
    id?: string;
    title: string;
    subtitle: string;
    badge: string;
    imageUrl: string;
    buttonText: string;
    linkUrl: string;
    isActive: boolean;
  }>({
    id: 'ban_shop_main',
    title: 'Gaming Shop & Diamond Center',
    subtitle: 'আপনার অর্জিত BRK Coins (🪙) অথবা Wallet Taka (৳) দিয়ে ইনস্ট্যান্ট ফ্রি ফায়ার ডায়মন্ড, উইকলি মেম্বারশিপ, স্কিন রিডিম ভাউচার ও ম্যাচ পাস কিনুন!',
    badge: 'BRK ESPORTS OFFICIAL REWARDS & COIN SHOP',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80',
    buttonText: 'VISIT GAMING SHOP',
    linkUrl: '/shop',
    isActive: true,
  });
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerSaveSuccess, setBannerSaveSuccess] = useState(false);

  // Modal State for Add / Edit Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [productForm, setProductForm] = useState<Partial<ShopProduct>>({
    name: '',
    description: '',
    category: 'DIAMONDS',
    currencyType: 'BOTH',
    priceCoins: 500,
    priceBdt: 80,
    diamonds: 100,
    bonusDiamonds: 0,
    icon: '💎',
    imageUrl: PRESET_SHOP_IMAGES[0].url,
    badge: 'HOT',
    stock: 999,
    isActive: true,
    deliveryType: 'FF_UID',
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Deliver Modal State
  const [deliverModalOrder, setDeliverModalOrder] = useState<ShopOrder | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, bRes] = await Promise.all([
        fetch('/api/admin/shop'),
        fetch('/api/banners?all=true'),
      ]);

      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setOrders(data.orders || []);
        if (data.stats) setStats(data.stats);
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.shopBanner) {
          setShopBanner(bData.shopBanner);
        } else if (bData.banners) {
          const found = bData.banners.find((b: any) => b.placement === 'SHOP_BANNER');
          if (found) setShopBanner(found);
        }
      }
    } catch (err) {
      console.warn('Failed to load admin shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: 'Instant Free Fire game delivery directly to player UID.',
      category: 'DIAMONDS',
      currencyType: 'BOTH',
      priceCoins: 500,
      priceBdt: 80,
      diamonds: 100,
      bonusDiamonds: 0,
      icon: '💎',
      imageUrl: PRESET_SHOP_IMAGES[0].url,
      badge: 'NEW',
      stock: 999,
      isActive: true,
      deliveryType: 'FF_UID',
    });
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: ShopProduct) => {
    setEditingProduct(p);
    setProductForm({
      ...p,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name?.trim()) {
      alert('Product name is required!');
      return;
    }

    setIsSavingProduct(true);
    try {
      const action = editingProduct ? 'UPDATE_PRODUCT' : 'ADD_PRODUCT';
      const payload = {
        action,
        product: {
          ...productForm,
          id: editingProduct?.id,
        },
      };

      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsProductModalOpen(false);
        loadData();
      } else {
        alert(data.message || 'Failed to save product.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving product.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this item from the shop?')) return;
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_PRODUCT', productId }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert('Failed to delete product.');
    }
  };

  const handleToggleActive = async (productId: string) => {
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_ACTIVE', productId }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert('Failed to toggle status.');
    }
  };

  const handleToggleHomeFeatured = async (productId: string) => {
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_HOME_FEATURED', productId }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert('Failed to toggle homepage featured status.');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all shop items back to default Free Fire & Esports products?')) return;
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DEFAULTS' }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert('Failed to reset defaults.');
    }
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverModalOrder) return;

    setIsProcessingDelivery(true);
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: deliverModalOrder.id,
          action: 'DELIVER',
          redeemCode: redeemCode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setDeliverModalOrder(null);
        setRedeemCode('');
        loadData();
      } else {
        alert(data.message || 'Failed to fulfill order.');
      }
    } catch (err: any) {
      alert(err.message || 'Error delivering order.');
    } finally {
      setIsProcessingDelivery(false);
    }
  };

  const handleRefund = async (order: ShopOrder) => {
    if (!confirm(`Refund ${order.amount} ${order.method === 'COINS' ? 'Coins' : 'BDT'} back to ${order.userName}?`)) return;

    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'REFUND',
        }),
      });

      if (res.ok) {
        loadData();
      } else {
        alert('Failed to refund order.');
      }
    } catch {
      alert('Error processing refund.');
    }
  };

  const handleSaveShopBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBanner(true);
    setBannerSaveSuccess(false);
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: shopBanner.id || 'ban_shop_main',
          title: shopBanner.title,
          subtitle: shopBanner.subtitle,
          badge: shopBanner.badge,
          imageUrl: shopBanner.imageUrl,
          buttonText: shopBanner.buttonText || 'VISIT GAMING SHOP',
          linkUrl: shopBanner.linkUrl || '/shop',
          placement: 'SHOP_BANNER',
          order: 1,
          isActive: shopBanner.isActive,
        }),
      });

      if (res.ok) {
        setBannerSaveSuccess(true);
        setTimeout(() => setBannerSaveSuccess(false), 3000);
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to save shop banner.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to save shop banner.');
    } finally {
      setIsSavingBanner(false);
    }
  };

  // Filtered lists
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      o.userName?.toLowerCase().includes(q) ||
      o.userEmail?.toLowerCase().includes(q) ||
      o.notes?.toLowerCase().includes(q) ||
      o.trxId?.toLowerCase().includes(q)
    );
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-8">
      
      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black font-heading tracking-wide">
              Gaming Shop & Diamond Manager
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Manage Coin Shop products, Free Fire Diamond packs, prices (Coins / Taka), and fulfill player orders.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('BANNER')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-heading font-black text-xs border border-white/15 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>CUSTOMIZE BANNER</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-orange hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD NEW SHOP ITEM</span>
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cash Revenue</span>
          <div className="text-2xl font-black text-emerald-600 font-heading">
            ৳ {stats.totalCashRevenue.toLocaleString()}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Coins Redeemed</span>
          <div className="text-2xl font-black text-amber-500 font-heading">
            {stats.totalCoinsSpent.toLocaleString()} 🪙
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Shop Items</span>
          <div className="text-2xl font-black text-slate-900 font-heading">
            {products.filter(p => p.isActive).length} / {products.length}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Orders & Deliveries</span>
          <div className="text-2xl font-black text-cyan-600 font-heading">
            {orders.length}
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'PRODUCTS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>SHOP ITEMS & INVENTORY ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'ORDERS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>PLAYER ORDERS & UID DELIVERIES ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BANNER')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'BANNER'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>SHOP & HOME BANNER</span>
          </button>
        </div>

        {activeTab === 'PRODUCTS' && (
          <button
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
            title="Reset to default items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        )}
      </div>

      {/* ══════════ TAB 1: PRODUCTS INVENTORY ══════════ */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-6">
          
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold">Loading shop items...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-slate-700 font-bold text-sm">No items in the shop inventory.</div>
              <button
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-xl bg-brand-orange text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Add First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                    product.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  {/* Top Thumbnail */}
                  <div className="relative w-full h-40 bg-slate-900 overflow-hidden">
                    <img
                      src={product.imageUrl || PRESET_SHOP_IMAGES[0].url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    
                    {/* Badge */}
                    {product.badge && (
                      <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black uppercase shadow-xs">
                        {product.badge}
                      </span>
                    )}

                    {/* Category */}
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                      {product.category}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading font-black text-slate-900 text-base leading-tight">
                          {product.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          product.currencyType === 'COINS'
                            ? 'bg-amber-100 text-amber-800'
                            : product.currencyType === 'WALLET'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {product.currencyType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {product.description || 'In-game reward item'}
                      </p>
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-bold">
                      <div className="text-emerald-700">৳ {product.priceBdt} BDT</div>
                      <div className="text-slate-300">•</div>
                      <div className="text-amber-600">{product.priceCoins.toLocaleString()} 🪙 Coins</div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleActive(product.id)}
                          className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={product.isActive ? 'Active in Shop (Click to disable)' : 'Disabled in Shop (Click to enable)'}
                        >
                          {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleToggleHomeFeatured(product.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            product.isFeaturedOnHome
                              ? 'bg-amber-50 text-amber-700 border border-amber-300 shadow-xs'
                              : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                          }`}
                          title={product.isFeaturedOnHome ? 'Featured on Homepage (Click to remove)' : 'Show on Homepage'}
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${product.isFeaturedOnHome ? 'text-amber-500 fill-amber-500' : ''}`} />
                          <span className="text-[10px]">
                            {product.isFeaturedOnHome ? 'On Home' : 'Feature'}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(product)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ══════════ TAB 2: USER ORDERS & DELIVERIES ══════════ */}
      {activeTab === 'ORDERS' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
          
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `All Orders (${orders.length})` },
                { id: 'PENDING', label: `⏳ Pending (${orders.filter(o => o.status === 'PENDING').length})`, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { id: 'VERIFIED', label: `✅ Delivered (${orders.filter(o => o.status === 'VERIFIED').length})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { id: 'REJECTED', label: `❌ Cancelled (${orders.filter(o => o.status === 'REJECTED').length})`, color: 'text-red-700 bg-red-50 border-red-200' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setOrderStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    orderStatusFilter === tab.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : tab.color || 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by player, UID, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:border-cyan-500 font-medium"
                />
              </div>

              <button
                onClick={loadData}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading shop orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-sm text-slate-600">No shop orders in this status</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Player Info</th>
                    <th className="px-4 py-3">Order Details / UID</th>
                    <th className="px-4 py-3">Paid With</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const isPending = order.status === 'PENDING';
                    const isDelivered = order.status === 'VERIFIED';
                    const isRejected = order.status === 'REJECTED';

                    return (
                      <tr key={order.id} className={`hover:bg-slate-50/50 ${isPending ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{order.userName}</div>
                          <div className="text-[11px] text-slate-500">{order.userEmail}</div>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="font-bold text-slate-800 line-clamp-1">{order.notes}</div>
                          <div className="text-[10px] text-slate-400 font-mono">TrxID: {order.trxId}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            order.method === 'COINS'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {order.method === 'COINS' ? `${order.amount.toLocaleString()} 🪙 Coins` : `৳ ${order.amount}`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit border ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : isRejected
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse font-black'
                          }`}>
                            {isDelivered && <CheckCircle2 className="w-3 h-3" />}
                            {isPending ? '⏳ PENDING' : isDelivered ? 'DELIVERED' : 'CANCELLED'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => setDeliverModalOrder(order)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Confirm & Deliver</span>
                                </button>
                                <button
                                  onClick={() => handleRefund(order)}
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  title="Cancel Order & Refund to User"
                                >
                                  Cancel / Refund
                                </button>
                              </>
                            ) : isDelivered ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-emerald-600">Delivered ✅</span>
                                <button
                                  onClick={() => handleRefund(order)}
                                  className="px-2 py-1 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                  title="Issue Refund"
                                >
                                  Refund
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-red-500">Refunded ❌</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB 3: SHOP & HOME BANNER CUSTOMIZER ══════════ */}
      {activeTab === 'BANNER' && (
        <div className="space-y-8">
          {/* Header Info */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-300/80 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-black font-heading text-slate-900">
                    Customize Gaming Shop & Homepage Banner
                  </h2>
                </div>
                <p className="text-xs text-slate-600">
                  This banner is displayed on top of the <strong>/shop</strong> page and as the featured interactive banner in the Homepage <strong>Shop Section</strong>. Clicking it redirects players directly to the shop!
                </p>
              </div>

              <button
                onClick={handleSaveShopBanner}
                disabled={isSavingBanner}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-heading font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                {isSavingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : bannerSaveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{bannerSaveSuccess ? 'Banner Saved Successfully!' : 'SAVE SHOP BANNER'}</span>
              </button>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-600" />
                  <span>Live Preview (হোমপেজ ও শপ পেজে যেমন দেখাবে):</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Clickable ➡️ /shop
                </span>
              </div>

              {/* Preview Card */}
              <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl text-white">
                {shopBanner.imageUrl && (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={shopBanner.imageUrl}
                      alt={shopBanner.title || 'Shop Banner'}
                      className="w-full h-full object-cover opacity-40 sm:opacity-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/70" />
                  </div>
                )}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    {shopBanner.badge && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                        <span>{shopBanner.badge}</span>
                      </div>
                    )}
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading tracking-tight text-white drop-shadow-md">
                      {shopBanner.title || 'Gaming Shop & Diamond Center'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed drop-shadow-sm">
                      {shopBanner.subtitle || 'আপনার অর্জিত BRK Coins অথবা Wallet Taka দিয়ে ফ্রি ফায়ার ডায়মন্ড কিনুন!'}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                    <span>{shopBanner.buttonText || 'VISIT GAMING SHOP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Editing Form */}
          <form onSubmit={handleSaveShopBanner} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Image URL & File Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase block">
                1. Banner Background / Poster Image (ছবির লিঙ্ক অথবা ফাইল আপলোড করুন) *
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600..."
                    value={shopBanner.imageUrl}
                    onChange={(e) => setShopBanner({ ...shopBanner, imageUrl: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 1600, 0.85);
                          setShopBanner({ ...shopBanner, imageUrl: compressed });
                        } catch (err) {
                          alert('Failed to process image from device.');
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* 1-Click Preset Gallery */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">
                  Or pick a 1-Click Gaming Preset Banner:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { name: '🔥 Free Fire Diamonds & Arena', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80' },
                    { name: '⚡ Neon Cyber Gaming Hub', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&auto=format&fit=crop&q=80' },
                    { name: '🏆 Golden Esports Trophy', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80' },
                    { name: '⚔️ Crimson Battleground', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1600&auto=format&fit=crop&q=80' },
                    { name: '👑 Royal Rewards & Crates', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1600&auto=format&fit=crop&q=80' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setShopBanner({ ...shopBanner, imageUrl: preset.url })}
                      className={`group relative rounded-xl overflow-hidden border-2 transition-all p-1 text-left flex flex-col justify-between h-20 ${
                        shopBanner.imageUrl === preset.url
                          ? 'border-amber-500 shadow-md ring-2 ring-amber-400/40'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="relative z-10 self-end">
                        {shopBanner.imageUrl === preset.url && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="relative z-10 text-[9px] font-bold text-white truncate drop-shadow-sm">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Banner Main Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gaming Shop & Diamond Center"
                  value={shopBanner.title}
                  onChange={(e) => setShopBanner({ ...shopBanner, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Category Tag / Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. 💎 BRK ESPORTS OFFICIAL REWARDS & COIN SHOP"
                  value={shopBanner.badge}
                  onChange={(e) => setShopBanner({ ...shopBanner, badge: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            {/* Subtitle / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase block">
                Subtitle / Description Text
              </label>
              <textarea
                rows={3}
                placeholder="আপনার অর্জিত BRK Coins অথবা Wallet Taka দিয়ে ইনস্ট্যান্ট ডায়মন্ড, উইকলি মেম্বারশিপ ও স্কিন রিওয়ার্ডস কিনুন!"
                value={shopBanner.subtitle}
                onChange={(e) => setShopBanner({ ...shopBanner, subtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
              />
            </div>

            {/* CTA Button Text & Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Button CTA Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. VISIT GAMING SHOP"
                  value={shopBanner.buttonText}
                  onChange={(e) => setShopBanner({ ...shopBanner, buttonText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Redirect Destination URL (ক্লিক করলে যেখানে যাবে)
                </label>
                <input
                  type="text"
                  placeholder="/shop"
                  value={shopBanner.linkUrl}
                  onChange={(e) => setShopBanner({ ...shopBanner, linkUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingBanner}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-orange hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                {isSavingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : bannerSaveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{bannerSaveSuccess ? 'Banner Saved Successfully!' : 'SAVE SHOP BANNER CHANGES'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ── Add / Edit Product Modal ── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-black text-xl text-slate-900">
                {editingProduct ? 'EDIT SHOP PRODUCT' : 'ADD NEW SHOP PRODUCT'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Product Title</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. 520 Free Fire Diamonds"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                  >
                    <option value="DIAMONDS">💎 Diamonds Pack</option>
                    <option value="PASSES">👑 Memberships & Passes</option>
                    <option value="SKINS">🎁 Skins & Redeem Codes</option>
                    <option value="TICKETS">🎟️ Tournament Match Tickets</option>
                    <option value="CRATES">📦 Mystery Boxes</option>
                    <option value="OTHERS">🛍️ Others</option>
                  </select>
                </div>
              </div>

              {/* Currency Mode & Prices */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Payment Currency Mode (ইউজার কীভাবে কিনতে পারবে)
                </label>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BOTH', label: '🔄 Coin & Taka Both' },
                    { id: 'COINS', label: '🪙 Coins Only' },
                    { id: 'WALLET', label: '৳ Taka Only' },
                  ].map((cur) => (
                    <button
                      key={cur.id}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, currencyType: cur.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        productForm.currencyType === cur.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cur.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-700 uppercase">Coin Price (🪙 Coins)</label>
                    <input
                      type="number"
                      value={productForm.priceCoins}
                      onChange={(e) => setProductForm({ ...productForm, priceCoins: Number(e.target.value) })}
                      placeholder="e.g. 500"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-700 uppercase">Taka Price (৳ BDT)</label>
                    <input
                      type="number"
                      value={productForm.priceBdt}
                      onChange={(e) => setProductForm({ ...productForm, priceBdt: Number(e.target.value) })}
                      placeholder="e.g. 80"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>
              </div>

              {/* Diamonds / Bonus / Badge */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Diamonds Count</label>
                  <input
                    type="number"
                    value={productForm.diamonds || 0}
                    onChange={(e) => setProductForm({ ...productForm, diamonds: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Bonus Diamonds</label>
                  <input
                    type="number"
                    value={productForm.bonusDiamonds || 0}
                    onChange={(e) => setProductForm({ ...productForm, bonusDiamonds: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Badge Label</label>
                  <input
                    type="text"
                    value={productForm.badge || ''}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                    placeholder="HOT / VIP / BEST"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase"
                  />
                </div>
              </div>

              {/* Image URL & Preset Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">Product Image URL</label>
                <input
                  type="text"
                  value={productForm.imageUrl || ''}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />

                <div className="flex items-center gap-2 overflow-x-auto pt-1">
                  {PRESET_SHOP_IMAGES.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, imageUrl: img.url })}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap cursor-pointer"
                    >
                      {img.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase block">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description || ''}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Details regarding delivery and game pack..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Homepage Featured Toggle Box */}
              <div className="flex items-center justify-between p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <div className="font-heading font-black text-xs text-amber-950">
                      Show as Featured Item on Homepage (হোমপেজে দেখান)
                    </div>
                    <div className="text-[10px] text-amber-700">
                      এই অপশন চালু রাখলে আইটেমটি সরাসরি ওয়েবসাইট হোমপেজের শপ সেকশনে শো করবে
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(productForm.isFeaturedOnHome)}
                  onChange={(e) => setProductForm({ ...productForm, isFeaturedOnHome: e.target.checked })}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2 bg-gradient-to-r from-brand-red to-brand-orange text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Product'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ── Deliver Modal ── */}
      {deliverModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Diamond className="w-5 h-5 text-cyan-500" />
              Fulfill Shop Order
            </h3>
            <p className="text-xs text-slate-600">
              Order for <strong>{deliverModalOrder.userName}</strong> ({deliverModalOrder.notes})
            </p>

            <form onSubmit={handleDeliver} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Voucher / Redeem Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. FFBD-8910-XQ72 (Leave blank if delivered directly to UID)"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliverModalOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingDelivery}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isProcessingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Confirm & Notify Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
