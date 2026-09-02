const fs = require('fs');
const file = 'src/components/storefront/StorefrontView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const handleExecuteCheckout = async \(\) => \{[\s\S]*?\n  \};\n\n  const handleCryptoPaymentSuccess/,
  `const handleExecuteCheckout = async () => {
    if (!customerEmail.trim() || !customerName.trim() || cart.length === 0) return;
    
    setIsProcessingPayment(true);
    
    try {
      const items = cart.map(i => ({
        productId: i.product.id,
        productTitle: i.product.title,
        price: i.product.pricing.recommendedPrice,
        quantity: i.quantity
      }));
      
      const stripeSk = localStorage.getItem('df_stripe_sk');
      if (stripeSk) {
         // Attempt real Stripe checkout
         let stripeWindow = window.open('about:blank', '_blank');
         if (!stripeWindow) {
            alert("Veuillez autoriser les pop-ups pour finaliser le paiement sécurisé sur Stripe.");
            setIsProcessingPayment(false);
            return;
         }
         try {
            const lineItems = items.map((item, index) => {
              const finalPrice = Math.round(item.price * (1 - promoDiscount/100) * 100);
              return \`line_items[\${index}][price_data][currency]=eur&line_items[\${index}][price_data][product_data][name]=\${encodeURIComponent(item.productTitle)}&line_items[\${index}][price_data][unit_amount]=\${finalPrice}&line_items[\${index}][quantity]=\${item.quantity}\`;
            }).join('&');

            const body = \`success_url=\${encodeURIComponent(window.location.origin + window.location.pathname + '?success=true&session_id={CHECKOUT_SESSION_ID}')}&cancel_url=\${encodeURIComponent(window.location.origin + window.location.pathname)}&mode=payment&customer_email=\${encodeURIComponent(customerEmail)}&\${lineItems}\`;

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
              if (stripeWindow) stripeWindow.close();
              alert(\`Erreur Stripe : \${data.error.message}\`);
              setIsProcessingPayment(false);
              return;
            }
            if (data.url) {
              localStorage.setItem('pending_checkout_cart', JSON.stringify({
                items, cartTotalEur, promoDiscount, customerName, customerEmail, customerAddress
              }));
              stripeWindow.location.href = data.url;
              return;
            }
         } catch (e) {
            if (stripeWindow) stripeWindow.close();
            console.error("Stripe Checkout Proxy Error", e);
         }
      }

      // Simulated Checkout for Demo Mode
      setTimeout(async () => {
        const order = await store.processCheckout({
          customerName,
          customerEmail,
          items,
          totalAmount: cartTotalEur,
          discountApplied: promoDiscount
        });
        const invoice = billingService.generateInvoiceForOrder(order, customerAddress);
        setGeneratedInvoice(invoice);
        setCompletedOrder(order);
        setCart([]);
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        store.addLog('success', 'stripe', \`Simulation de paiement (Mode Demo) validée pour la commande \${order.orderNumber}.\`);
        setIsProcessingPayment(false);
      }, 1500);

    } catch (e) {
      console.error(e);
      setIsProcessingPayment(false);
    }
  };

  const handleCryptoPaymentSuccess`
);

content = content.replace(
  /const stripeSk = localStorage\.getItem\('df_stripe_sk'\) \|\| 'rk_live_.*?';/g,
  "const stripeSk = localStorage.getItem('df_stripe_sk');"
);

fs.writeFileSync(file, content);
console.log('StorefrontView.tsx checkout fixed successfully');
