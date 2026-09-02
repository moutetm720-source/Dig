const fs = require('fs');

let code = fs.readFileSync('src/components/storefront/StorefrontView.tsx', 'utf-8');

// Function to replace hardcoded reviews with dynamic ones
// We will generate the JSX block for reviews based on a hash of the product id.
const replaceBlock = `const getDeterministicReviews = (productId: string) => {
  const hash = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const count = (hash % 4) + 2; // 2 to 5 reviews
  
  const names = ['Julien D.', 'Marie C.', 'Thomas B.', 'Sophie L.', 'Lucas M.', 'Emma R.', 'Antoine P.'];
  const roles = ['Développeur Freelance', 'Fondatrice', 'CTO', 'Designer', 'Indie Hacker'];
  const texts = [
    "Exactement ce dont j'avais besoin. Le code est super propre.",
    "J'ai gagné au moins 3 semaines de dev. Incroyable !",
    "La meilleure architecture que j'ai pu voir pour ce type de projet.",
    "Une rentabilité immédiate. Déployé en 2 jours.",
    "Documentation au top. Le support est super réactif."
  ];

  let res = [];
  for(let i=0; i<count; i++) {
    const idx = (hash + i);
    res.push({
      name: names[idx % names.length],
      initials: names[idx % names.length].substring(0, 2).toUpperCase(),
      role: roles[idx % roles.length],
      text: texts[idx % texts.length]
    });
  }
  return res;
};
`;

if(!code.includes('getDeterministicReviews')) {
    code = code.replace(/export default function StorefrontView\(\{\s*previewMode\s*=\s*false\s*\}\)\s*\{/, replaceBlock + '\nexport default function StorefrontView({ previewMode = false }) {');
}

// Replace the reviews rendering block
code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-3">[\s\S]*?<div className="h-px bg-slate-800\/50"><\/div>/, 
`{/* Dynamic Reviews */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {getDeterministicReviews(selectedProduct.id).map((rev, idx) => (
    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-bold">{rev.initials}</div>
        <div>
          <div className="text-[11px] font-bold text-slate-200">{rev.name}</div>
          <div className="text-[9px] text-slate-500">{rev.role}</div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">"{rev.text}"</p>
    </div>
  ))}
</div>
<div className="h-px bg-slate-800/50"></div>`);

fs.writeFileSync('src/components/storefront/StorefrontView.tsx', code);
