const fs = require('fs');
let code = fs.readFileSync('src/components/storefront/StorefrontView.tsx', 'utf-8');

code = code.replace(
  /<div className="grid grid-cols-1 gap-3">[\s\S]*?<ShoppingBag className="w-4 h-4" \/>/,
  `<div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => addToCart(selectedProduct)}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />`
);

fs.writeFileSync('src/components/storefront/StorefrontView.tsx', code);
