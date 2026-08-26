const fs = require('fs');

const content = fs.readFileSync('app/admin/shop/page.tsx', 'utf-8');

const startIdx = content.indexOf('      {/* ══════════ TAB 3: SHOP BANNER REDIRECT');
const endIdx = content.indexOf('      {/* ── Add / Edit Product Modal ── */}');

if (startIdx !== -1 && endIdx !== -1) {
    const newText = `      {/* ══════════ TAB 3: SHOP BANNER REDIRECT ══════════ */}
      {activeTab === 'BANNER' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Sparkles className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-black font-heading text-slate-900">Multiple Shop Banners & Slider Manager</h2>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto">You can now add <strong>multiple banners</strong> to the shop page to create an auto-sliding carousel. To manage these banners, please use the Main Banners Manager.</p>
          <div className="pt-6">
            <a href="/admin/banners" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-sm uppercase tracking-wider shadow-neon-orange hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <span>Go To Banners Manager</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-4">Select <strong>"🛍️ Shop & Home Banner"</strong> from the Placement dropdown to add them to the shop slider.</p>
        </div>
      )}\n\n`;
    
    const newContent = content.substring(0, startIdx) + newText + content.substring(endIdx);
    fs.writeFileSync('app/admin/shop/page.tsx', newContent, 'utf-8');
    console.log('Successfully replaced.');
} else {
    console.log(`Could not find indices. start: ${startIdx}, end: ${endIdx}`);
}
