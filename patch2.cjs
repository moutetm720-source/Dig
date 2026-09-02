const fs = require('fs');
const file = 'src/components/storefront/StorefrontView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(`                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >`, `                  <button
                    onClick={() => {
                      if (!isProcessingPayment) handleDirectStripeCheckout();
                    }}
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >`);

fs.writeFileSync(file, content);
