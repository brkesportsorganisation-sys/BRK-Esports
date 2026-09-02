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
  Upload,
  MessageCircle,
  TrendingUp,
  Percent,
  Shirt,
  ShieldCheck,
  Zap,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Info,
  CheckCheck
} from 'lucide-react';
import { ShopProduct, DEFAULT_SHOP_PRODUCTS, ShopCoupon } from '@/lib/types';
import ImageUploadInput from '@/components/ui/ImageUploadInput';

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
  { name: 'Esports Jersey / Merch 👕', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80' },
];

export default function AdminGamingShopPage() {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'ORDERS' | 'COUPONS' | 'BANNER' | 'ANALYTICS'>('PRODUCTS');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [coupons, setCoupons] = useState<ShopCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCashRevenue: 0,
    totalCoinsSpent: 0,
    completedDeliveries: 0,
    processingDeliveries: 0,
    pendingDeliveries: 0,
    rejectedDeliveries: 0,
  });

  // Shop Banner State
  const [shopBanner, setShopBanner] = useState<{
    title: string;
    subtitle: string;
    badge: string;
    imageUrl: string;
    buttonText: string;
    linkUrl: string;
    isActive: boolean;
  }>({
    title: 'OFFICIAL GAMING & TOP-UP STORE',
    subtitle: 'Get instant Free Fire Diamonds, Weekly & Monthly Memberships, and Exclusive Esports Merch with 100% security.',
    badge: '💎 INSTANT UID TOP-UP',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    buttonText: 'EXPLORE DEALS',
    linkUrl: '/shop',
    isActive: true,
  });
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerSaveSuccess, setBannerSaveSuccess] = useState(false);

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'DIAMONDS' as ShopProduct['category'],
    currencyType: 'BOTH' as ShopProduct['currencyType'],
    priceCoins: 0,
    priceBdt: 0,
    originalPriceBdt: 0,
    diamonds: 0,
    bonusDiamonds: 0,
    icon: '💎',
    imageUrl: '',
    badge: '',
    stock: '',
    deliveryType: 'FF_UID' as ShopProduct['deliveryType'],
    isActive: true,
    isFeaturedOnHome: false,
  });

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountAmountBdt, setDiscountAmountBdt] = useState('');
  const [minOrderBdt, setMinOrderBdt] = useState('100');
  const [maxUses, setMaxUses] = useState('100');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);

  // Order Delivery Modal State
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [deliveryAction, setDeliveryAction] = useState<'DELIVER' | 'PROCESSING' | 'REFUND' | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/shop', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setOrders(data.orders || []);
        setCoupons(data.coupons || []);
        if (data.stats) setStats(data.stats);
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Product Actions
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: 'DIAMONDS',
      currencyType: 'BOTH',
      priceCoins: 500,
      priceBdt: 50,
      originalPriceBdt: 60,
      diamonds: 0,
      bonusDiamonds: 0,
      icon: '🛍️',
      imageUrl: PRESET_SHOP_IMAGES[0].url,
      badge: 'POPULAR',
      stock: '',
      deliveryType: 'FF_UID',
      isActive: true,
      isFeaturedOnHome: false,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: ShopProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || 'DIAMONDS',
      currencyType: product.currencyType || 'BOTH',
      priceCoins: product.priceCoins || 0,
      priceBdt: product.priceBdt || 0,
      originalPriceBdt: product.originalPriceBdt || 0,
      diamonds: product.diamonds || 0,
      bonusDiamonds: product.bonusDiamonds || 0,
      icon: product.icon || '🛍️',
      imageUrl: product.imageUrl || '',
      badge: product.badge || '',
      stock: product.stock !== undefined ? String(product.stock) : '',
      deliveryType: product.deliveryType || 'FF_UID',
      isActive: product.isActive !== false,
      isFeaturedOnHome: Boolean(product.isFeaturedOnHome),
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);

    try {
      const payload = {
        ...formData,
        priceCoins: Number(formData.priceCoins) || 0,
        priceBdt: Number(formData.priceBdt) || 0,
        originalPriceBdt: formData.originalPriceBdt ? Number(formData.originalPriceBdt) : undefined,
        diamonds: formData.category === 'DIAMONDS' && formData.diamonds ? Number(formData.diamonds) : undefined,
        bonusDiamonds: formData.category === 'DIAMONDS' && formData.bonusDiamonds ? Number(formData.bonusDiamonds) : undefined,
        stock: formData.stock !== '' ? Number(formData.stock) : undefined,
      };

      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: editingProduct ? 'UPDATE_PRODUCT' : 'ADD_PRODUCT',
          product: editingProduct ? { ...payload, id: editingProduct.id } : payload,
        }),
      });

      if (res.ok) {
        setIsProductModalOpen(false);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product from the shop?')) return;
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'DELETE_PRODUCT', productId: id }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProductStatus = async (id: string) => {
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'TOGGLE_ACTIVE', productId: id }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'TOGGLE_HOME_FEATURED', productId: id }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset entire shop inventory to standard Free Fire packages? Custom changes will be overwritten.')) return;
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'RESET_DEFAULTS' }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Order Actions
  const handleOpenOrderAction = (order: ShopOrder, action: 'DELIVER' | 'PROCESSING' | 'REFUND') => {
    setSelectedOrder(order);
    setDeliveryAction(action);
    setRedeemCode('');
    setActionNote('');
  };

  const handleExecuteOrderAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !deliveryAction) return;

    setIsUpdatingOrder(true);
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: deliveryAction,
          redeemCode: redeemCode.trim() || undefined,
          note: actionNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSelectedOrder(null);
        setDeliveryAction(null);
        await loadData();
      }
    } catch (err) {
      console.error('Order action failed:', err);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Coupon Actions
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCoupon(true);
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ADD_COUPON',
          coupon: {
            code: couponCode,
            discountPercent: discountPercent ? Number(discountPercent) : undefined,
            discountAmountBdt: discountAmountBdt ? Number(discountAmountBdt) : undefined,
            minOrderBdt: minOrderBdt ? Number(minOrderBdt) : 0,
            maxUses: maxUses ? Number(maxUses) : undefined,
            expiryDate: expiryDate || undefined,
          },
        }),
      });

      if (res.ok) {
        setIsCouponModalOpen(false);
        setCouponCode('');
        setDiscountPercent('');
        setDiscountAmountBdt('');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon code?')) return;
    try {
      await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'DELETE_COUPON', couponId: id }),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCoupon = async (id: string) => {
    try {
      await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'TOGGLE_COUPON', couponId: id }),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper parsing notes
  const parseOrderDetails = (notes: string) => {
    const itemMatch = notes.match(/\[Shop Order\]\s*([^|]+)/i);
    const uidMatch = notes.match(/UID:\s*([^|]+)/i);
    const ignMatch = notes.match(/IGN:\s*([^|]+)/i);
    const methodMatch = notes.match(/Method:\s*([^|]+)/i);
    const couponMatch = notes.match(/Coupon:\s*([^|]+)/i);
    const addressMatch = notes.match(/Address:\s*([^|]+)/i);

    return {
      itemName: itemMatch ? itemMatch[1].trim() : 'Gaming Package',
      uid: uidMatch ? uidMatch[1].trim() : '',
      ign: ignMatch ? ignMatch[1].trim() : '',
      method: methodMatch ? methodMatch[1].trim() : '',
      coupon: couponMatch ? couponMatch[1].trim() : '',
      address: addressMatch ? addressMatch[1].trim() : '',
    };
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredOrders = orders.filter(o => {
    const details = parseOrderDetails(o.notes || '');
    const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          details.uid.includes(searchQuery) ||
                          details.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Live KPIs Bar */}
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-[#0E1322] to-slate-900/60 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-violet-400 font-bold">
                COMMERCE & FULFILLMENT
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE TOP-UP ENGINE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-violet-400" />
              <span>Gaming Shop & Diamond Fulfillment</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Manage in-game Free Fire diamond packages, memberships, instant UID delivery, discount coupons, and financial ledger.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleOpenAddProduct}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-violet-900/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>

            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-amber-400" />
              <span>New Coupon</span>
            </button>

            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Gross Cash Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
              ৳ {stats.totalCashRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Wallet Payments</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Coins Redeemed</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
              {stats.totalCoinsSpent.toLocaleString()} 🪙
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">EZBD Coins Spent</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Pending Deliveries</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
              {stats.pendingDeliveries + stats.processingDeliveries} Orders
            </div>
            <div className="text-[10px] text-amber-400 font-bold mt-0.5">
              {stats.pendingDeliveries} Pending • {stats.processingDeliveries} Processing
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Active Catalog</span>
              <Package className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
              {products.filter(p => p.isActive).length} / {products.length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{coupons.length} Active Coupons</div>
          </div>
        </div>
      </div>


      {/* 3. TAB 1: PRODUCTS CATALOG */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-violet-400" />
                <span>Category:</span>
              </span>

              {['ALL', 'DIAMONDS', 'PASSES', 'SKINS', 'CRATES', 'VOUCHERS', 'MERCH'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'All Items' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#07090E] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="py-20 text-center text-violet-400 font-mono text-xs">
              LOADING SHOP INVENTORY...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-16 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300">No Products Found</p>
              <p className="text-xs text-slate-500">Create a new item or reset to defaults.</p>
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-xl bg-violet-600/10 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-600/20"
              >
                Reset Default Free Fire Packages
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const discount = p.originalPriceBdt && p.originalPriceBdt > p.priceBdt
                  ? Math.round(((p.originalPriceBdt - p.priceBdt) / p.originalPriceBdt) * 100)
                  : null;

                return (
                  <div
                    key={p.id}
                    className={`rounded-3xl border transition-all p-5 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                      p.isActive
                        ? 'border-slate-800 bg-[#0C101A] hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-950/20'
                        : 'border-red-900/30 bg-[#0C101A]/50 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] font-bold">
                            {p.category}
                          </span>
                          {p.isFeaturedOnHome && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1">
                              ⭐ HOMEPAGE
                            </span>
                          )}
                          {p.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-extrabold border border-violet-500/40">
                              {p.badge}
                            </span>
                          )}
                          {discount && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                              SAVE {discount}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleFeatured(p.id)}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              p.isFeaturedOnHome
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                            title={p.isFeaturedOnHome ? 'Featured on Homepage (Click to Remove)' : 'Click to Show on Homepage'}
                          >
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] hidden sm:inline">{p.isFeaturedOnHome ? 'On Home' : 'Feature'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleProductStatus(p.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              p.isActive
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}
                            title={p.isActive ? 'Active (Click to Hide)' : 'Hidden (Click to Activate)'}
                          >
                            {p.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Image & Title */}
                      <div className="flex gap-3.5 items-start">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 relative">
                          <img
                            src={p.imageUrl || PRESET_SHOP_IMAGES[0].url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-white truncate leading-snug">{p.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{p.description}</p>
                          
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono">Delivery: <strong className="text-slate-300">{p.deliveryType || 'FF_UID'}</strong></span>
                            <span>•</span>
                            <span>Stock: <strong className="text-slate-300">{p.stock !== undefined ? p.stock : 'Unlimited'}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white font-mono">৳ {p.priceBdt}</span>
                          {p.originalPriceBdt && p.originalPriceBdt > p.priceBdt && (
                            <span className="text-xs text-slate-500 line-through font-mono">৳ {p.originalPriceBdt}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-amber-400 font-mono">
                          {p.priceCoins} 🪙 Coins
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* 4. TAB 2: LIVE ORDERS & FULFILLMENT */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          
          {/* Order Filter Bar */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-violet-400" />
                <span>Status:</span>
              </span>

              {(['ALL', 'PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    orderStatusFilter === st
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Orders' : st === 'VERIFIED' ? 'Delivered' : st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Player, UID, TrxID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#07090E] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-violet-400" />
                <h2 className="font-heading font-black text-base text-white">
                  Shop Top-Up Orders ({filteredOrders.length})
                </h2>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Real-Time Fulfillment Queue
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-400">No Orders Found</p>
                <p>Orders submitted by players from the shop will appear here for instant fulfillment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date / ID</th>
                      <th className="p-3">Player Info</th>
                      <th className="p-3">Free Fire UID</th>
                      <th className="p-3">Ordered Item</th>
                      <th className="p-3">Paid Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Fulfillment Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredOrders.map((order) => {
                      const details = parseOrderDetails(order.notes || '');

                      return (
                        <tr key={order.id} className="hover:bg-slate-900/40 transition-colors">
                          
                          {/* ID & Date */}
                          <td className="p-3">
                            <div className="font-mono text-violet-300 font-bold text-[11px]">{order.id}</div>
                            <div className="text-slate-500 text-[10px] mt-0.5">
                              {new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          </td>

                          {/* Player */}
                          <td className="p-3">
                            <div className="font-bold text-white">{order.userName}</div>
                            <div className="text-slate-400 text-[10px]">{order.userEmail}</div>
                            {details.ign && (
                              <div className="text-[10px] text-cyan-400 font-mono">IGN: {details.ign}</div>
                            )}
                          </td>

                          {/* UID */}
                          <td className="p-3">
                            {details.uid ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#07090E] border border-slate-800 text-cyan-300 font-mono font-bold">
                                <span>{details.uid}</span>
                                <button
                                  onClick={() => handleCopy(details.uid, `uid_${order.id}`)}
                                  className="text-slate-500 hover:text-white"
                                  title="Copy Player UID"
                                >
                                  {copiedId === `uid_${order.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono">-</span>
                            )}
                          </td>

                          {/* Item */}
                          <td className="p-3">
                            <div className="font-bold text-slate-200">{details.itemName}</div>
                            {details.address && (
                              <div className="text-[10px] text-amber-300 mt-0.5 line-clamp-1">📍 {details.address}</div>
                            )}
                          </td>

                          {/* Price / Method */}
                          <td className="p-3">
                            <div className="font-mono font-bold text-white">
                              {order.method === 'COINS' ? `${order.amount} 🪙 Coins` : `৳ ${order.amount}`}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{order.method}</div>
                          </td>

                          {/* Status */}
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                              order.status === 'VERIFIED'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : order.status === 'PROCESSING'
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                : order.status === 'REJECTED'
                                ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}>
                              {order.status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                              {order.status === 'PROCESSING' && <Clock className="w-3 h-3 animate-spin" />}
                              <span>{order.status === 'VERIFIED' ? 'DELIVERED' : order.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status !== 'VERIFIED' && (
                                <>
                                  {order.status !== 'PROCESSING' && (
                                    <button
                                      onClick={() => handleOpenOrderAction(order, 'PROCESSING')}
                                      className="px-2.5 py-1 rounded-lg bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold"
                                    >
                                      Process
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleOpenOrderAction(order, 'DELIVER')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                                  >
                                    Deliver ✅
                                  </button>

                                  <button
                                    onClick={() => handleOpenOrderAction(order, 'REFUND')}
                                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold"
                                    title="Cancel & Auto Refund"
                                  >
                                    Refund
                                  </button>
                                </>
                              )}

                              {details.uid && (
                                <a
                                  href={`https://wa.me/?text=Hello%20${encodeURIComponent(order.userName)},%20regarding%20your%20top-up%20order%20(${order.id})%20for%20Free%20Fire%20UID:%20${details.uid}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                  title="WhatsApp Chat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
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

        </div>
      )}

      {/* 5. TAB 3: PROMO COUPONS */}
      {activeTab === 'COUPONS' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="font-heading font-black text-base text-white">Promo & Discount Coupons</h2>
                <p className="text-xs text-slate-400">Manage promotional codes that players can apply at checkout.</p>
              </div>

              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Coupon</span>
              </button>
            </div>

            {coupons.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No active coupon codes created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-[#07090E] flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono font-black text-sm">
                        {c.code}
                      </span>
                      <button
                        onClick={() => handleToggleCoupon(c.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.isActive
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-300 border-red-500/30'
                        }`}
                      >
                        {c.isActive ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-white font-bold">
                        Discount: {c.discountPercent ? `${c.discountPercent}% OFF` : `৳ ${c.discountAmountBdt} OFF`}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Min Spend: ৳{c.minOrderBdt || 0} • Used: {c.usedCount} / {c.maxUses || '∞'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 4: BANNER CUSTOMIZER */}
      {activeTab === 'BANNER' && (
        <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="font-heading font-black text-lg text-white">Storefront Hero Banner Customizer</h2>
            <p className="text-xs text-slate-400">Configure the main promotional banner shown at the top of the gaming shop.</p>
          </div>

          {/* Live Preview */}
          <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/60 via-[#0E1322] to-slate-900 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-xl space-y-3">
              <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 font-mono text-[10px] font-bold border border-violet-500/40">
                {shopBanner.badge || '💎 SPECIAL PROMO'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">{shopBanner.title}</h2>
              <p className="text-xs sm:text-sm text-slate-300">{shopBanner.subtitle}</p>
              <div className="pt-2">
                <span className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs inline-block">
                  {shopBanner.buttonText || 'SHOP NOW'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Headline Title *</label>
              <input
                type="text"
                value={shopBanner.title}
                onChange={(e) => setShopBanner({ ...shopBanner, title: e.target.value })}
                className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Badge Tag</label>
              <input
                type="text"
                value={shopBanner.badge}
                onChange={(e) => setShopBanner({ ...shopBanner, badge: e.target.value })}
                className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-bold mb-1">Subtitle Description</label>
              <textarea
                value={shopBanner.subtitle}
                onChange={(e) => setShopBanner({ ...shopBanner, subtitle: e.target.value })}
                rows={2}
                className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 5: ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
            <h3 className="font-heading font-black text-base text-white">Payment Method Breakdown</h3>
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white">Wallet Balance (BDT Cash)</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">৳ {stats.totalCashRevenue.toLocaleString()}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-white">EZBD Coins System</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">{stats.totalCoinsSpent.toLocaleString()} Coins</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
            <h3 className="font-heading font-black text-base text-white">Fulfillment Completion Rate</h3>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-4xl font-black text-emerald-400 font-mono">
                {stats.totalOrders > 0 ? Math.round((stats.completedDeliveries / stats.totalOrders) * 100) : 100}%
              </div>
              <p className="text-xs text-slate-400">
                {stats.completedDeliveries} of {stats.totalOrders} total shop orders fulfilled
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0C101A] rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-800 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {editingProduct ? 'Edit Gaming Product' : 'Add New Gaming Package'}
                </h3>
                <p className="text-xs text-slate-400">Configure Free Fire diamonds, pass prices, stock and delivery.</p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 530 + 53 Bonus Diamonds"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-violet-500"
                  >
                    <option value="DIAMONDS">💎 Free Fire Diamonds</option>
                    <option value="PASSES">👑 Memberships & Passes</option>
                    <option value="SKINS">🔫 Gun Skins & Evo Tokens</option>
                    <option value="CRATES">📦 Crates & Airdrops</option>
                    <option value="VOUCHERS">🎁 Digital Redeem Vouchers</option>
                    <option value="MERCH">👕 Esports Merchandise</option>
                    <option value="OTHERS">✨ Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Delivery Method *</label>
                  <select
                    value={formData.deliveryType}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as any })}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-violet-500"
                  >
                    <option value="FF_UID">🎯 Direct Free Fire UID Top-Up</option>
                    <option value="REDEEM_CODE">🎟️ Instant Digital Redeem Code</option>
                    <option value="MANUAL">🛡️ Manual Admin Delivery</option>
                    <option value="PHYSICAL">📦 Physical Parcel Shipping</option>
                  </select>
                </div>

                {formData.category === 'DIAMONDS' && (
                  <>
                    <div>
                      <label className="block text-cyan-300 font-bold mb-1">Base Diamonds (💎)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.diamonds || ''}
                        onChange={(e) => setFormData({ ...formData, diamonds: Number(e.target.value) || 0 })}
                        placeholder="e.g. 115"
                        className="w-full bg-[#07090E] border border-cyan-800/80 rounded-xl p-3 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-cyan-300 font-bold mb-1">Bonus Diamonds (💎)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.bonusDiamonds || ''}
                        onChange={(e) => setFormData({ ...formData, bonusDiamonds: Number(e.target.value) || 0 })}
                        placeholder="e.g. 10 (Optional)"
                        className="w-full bg-[#07090E] border border-cyan-800/80 rounded-xl p-3 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Sale Price (BDT ৳) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.priceBdt}
                    onChange={(e) => setFormData({ ...formData, priceBdt: Number(e.target.value) })}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Original Price (BDT ৳) (For Strikethrough)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.originalPriceBdt}
                    onChange={(e) => setFormData({ ...formData, originalPriceBdt: Number(e.target.value) })}
                    placeholder="e.g. 100 (Shows discount)"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Price in EZBD Coins (🪙)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceCoins}
                    onChange={(e) => setFormData({ ...formData, priceCoins: Number(e.target.value) })}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-amber-300 font-mono font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Currency Type</label>
                  <select
                    value={formData.currencyType}
                    onChange={(e) => setFormData({ ...formData, currencyType: e.target.value as any })}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-violet-500"
                  >
                    <option value="BOTH">Both Wallet (৳) & Coins (🪙)</option>
                    <option value="WALLET">Wallet Cash (৳) Only</option>
                    <option value="COINS">EZBD Coins (🪙) Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. HOT, BEST VALUE, 25% OFF"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Stock Quantity (Leave blank for Unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <ImageUploadInput
                    label="Product Image"
                    theme="dark"
                    required
                    value={formData.imageUrl}
                    onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                    placeholder="https://... or upload image from device"
                    presets={PRESET_SHOP_IMAGES.map(p => ({ label: p.name, url: p.url }))}
                    helperText="Upload any product picture from device • Auto-compressed to WebP"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Product Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief details about delivery, diamond amounts or instructions..."
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* SHOW ON HOMEPAGE TOGGLE */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>Show on Homepage (হোমপেজে দেখান)</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      এটি চালু রাখলে শুধুমাত্র নির্বাচিত এই প্রোডাক্টটি হোমপেজের শপ সেকশনে সরাসরি প্রদর্শিত হবে।
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isFeaturedOnHome)}
                      onChange={(e) => setFormData({ ...formData, isFeaturedOnHome: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-600 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Package</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER FULFILLMENT / ACTION */}
      {selectedOrder && deliveryAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0C101A] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {deliveryAction === 'DELIVER' && '✅ Mark Order Delivered'}
                  {deliveryAction === 'PROCESSING' && '⏳ Start Processing Order'}
                  {deliveryAction === 'REFUND' && '❌ Cancel & Auto-Refund'}
                </h3>
                <p className="text-xs text-slate-400">Order ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setDeliveryAction(null); }}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteOrderAction} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400">Player: <strong className="text-white">{selectedOrder.userName}</strong></div>
                <div className="text-slate-400">Item: <strong className="text-white">{parseOrderDetails(selectedOrder.notes || '').itemName}</strong></div>
                <div className="text-slate-400">Free Fire UID: <strong className="text-cyan-300 font-mono">{parseOrderDetails(selectedOrder.notes || '').uid || 'N/A'}</strong></div>
              </div>

              {deliveryAction === 'DELIVER' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Voucher / Redeem Code (Optional)</label>
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="e.g. GA-84920492"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">If filled, player will receive this code in their notification.</p>
                </div>
              )}

              {deliveryAction === 'REFUND' && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  ⚠️ This will instantly return 100% of the player's payment ({selectedOrder.amount} {selectedOrder.method === 'COINS' ? 'Coins' : 'BDT'}) back to their balance.
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">Admin Note / Message</label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={deliveryAction === 'REFUND' ? 'Reason for cancellation (e.g. Invalid UID)' : 'Optional remarks'}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(null); setDeliveryAction(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingOrder}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    deliveryAction === 'DELIVER'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : deliveryAction === 'REFUND'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  {isUpdatingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Confirm Action</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE COUPON */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0C101A] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">Create Promo Coupon</h3>
                <p className="text-xs text-slate-400">Generate discount codes for the shop checkout.</p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIAMOND20"
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Discount (% Percent)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Or Flat BDT (৳)</label>
                  <input
                    type="number"
                    min="1"
                    value={discountAmountBdt}
                    onChange={(e) => setDiscountAmountBdt(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Min Spend (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderBdt}
                    onChange={(e) => setMinOrderBdt(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Max Usages</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCoupon}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Create Coupon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
