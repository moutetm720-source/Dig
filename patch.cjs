const fs = require('fs');
const file = 'src/components/storefront/StorefrontView.tsx';
let content = fs.readFileSync(file, 'utf8');

const newFn = `
  const handleDirectStripeCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessingPayment(true);
    
    const items = cart.map(i => ({
      productId: i.product.id,
      productTitle: i.product.title,
      price: i.product.pricing.recommendedPrice,
      quantity: i.quantity
    }));
    
    const stripeSk = localStorage.getItem('df_stripe_sk');
    if (stripeSk) {
      try {
        const lineItems = items.map((item, index) => {
          const finalPrice = Math.round(item.price * (1 - promoDiscount/100) * 100);
          return \`line_items[\${index}][price_data][currency]=eur&line_items[\${index}][price_data][product_data][name]=\${encodeURIComponent(item.productTitle)}&line_items[\${index}][price_data][unit_amount]=\${finalPrice}&line_items[\${index}][quantity]=\${item.quantity}\`;
        }).join('&');
        
        const body = \`success_url=\${encodeURIComponent(window.location.origin + window.location.pathname + '?success=true&session_id={CHECKOUT_SESSION_ID}')}&cancel_url=\${encodeURIComponent(window.location.origin + window.location.pathname)}&mode=payment&\${lineItems}\`;
        
        const res = await fetch('/api/stripe/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${stripeSk}\`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body
        });
        const data = await res.json();
        if (data.error) {
          alert(\`Erreur Stripe : \${data.error.message}\`);
          setIsProcessingPayment(false);
          return;
        }
        if (data.url) {
          localStorage.setItem('pending_checkout_cart', JSON.stringify({
            items, cartTotalEur, promoDiscount, customerName: '', customerEmail: '', customerAddress: ''
          }));
          window.location.href = data.url;
          return;
        }
      } catch (e) {
        console.error("Stripe Checkout Proxy Error", e);
        alert("Une erreur est survenue lors de l'initialisation du paiement Stripe.");
        setIsProcessingPayment(false);
        return;
      }
    } else {
      // Fallback to local checkout modal if no Stripe API Key
      setIsCartOpen(false);
      setIsCheckoutOpen(true);
      setIsProcessingPayment(false);
    }
  };

  const handleExecuteCheckout = async () => {`;

content = content.replace('  const handleExecuteCheckout = async () => {', newFn);
fs.writeFileSync(file, content);
