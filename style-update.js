const fs = require('fs');
const glob = require('glob');

const brandRed = '#AB1509';
const softYellow = '#fff7d3';

const replacements = [
  // cart.tsx
  { file: 'components/pos/cart.tsx', search: /ring-blue-500/g, replace: 'ring-red-700' },
  { file: 'components/pos/cart.tsx', search: /hover:text-blue-600/g, replace: 'hover:text-red-700' },
  // category-tabs.tsx
  { file: 'components/pos/category-tabs.tsx', search: /bg-blue-700/g, replace: 'bg-[#AB1509]' },
  // numpad.tsx
  { file: 'components/pos/numpad.tsx', search: /bg-blue-700/g, replace: 'bg-[#AB1509]' },
  // order-panel.tsx
  { file: 'components/pos/order-panel.tsx', search: /ring-blue-500/g, replace: 'ring-red-700' },
  { file: 'components/pos/order-panel.tsx', search: /bg-blue-50/g, replace: 'bg-red-50' },
  { file: 'components/pos/order-panel.tsx', search: /border-blue-600/g, replace: 'border-[#AB1509]' },
  { file: 'components/pos/order-panel.tsx', search: /bg-blue-700/g, replace: 'bg-[#AB1509]' },
  { file: 'components/pos/order-panel.tsx', search: /hover:bg-blue-800/g, replace: 'hover:bg-red-900' },
  // payment-dialog.tsx
  { file: 'components/pos/payment-dialog.tsx', search: /bg-blue-700/g, replace: 'bg-[#AB1509]' },
  { file: 'components/pos/payment-dialog.tsx', search: /text-blue-600/g, replace: 'text-[#AB1509]' },
  { file: 'components/pos/payment-dialog.tsx', search: /hover:text-blue-700/g, replace: 'hover:text-red-800' },
  // product-grid.tsx
  { file: 'components/pos/product-grid.tsx', search: /hover:border-blue-400/g, replace: 'hover:border-[#AB1509]' },
  { file: 'components/pos/product-grid.tsx', search: /text-blue-700/g, replace: 'text-[#AB1509]' },
  // product-search.tsx
  { file: 'components/pos/product-search.tsx', search: /ring-blue-500/g, replace: 'ring-red-700' },
  { file: 'components/pos/product-search.tsx', search: /border-blue-500/g, replace: 'border-red-700' },
  { file: 'components/pos/product-search.tsx', search: /text-blue-600/g, replace: 'text-[#AB1509]' },
  // pos-client.tsx
  { file: 'app/(dashboard)/pos/pos-client.tsx', search: /ring-blue-500/g, replace: 'ring-red-700' },
  { file: 'app/(dashboard)/pos/pos-client.tsx', search: /bg-slate-100/g, replace: 'bg-[#fdfbf7]' },
];

replacements.forEach(({ file, search, replace }) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
  }
});
console.log('Styles updated.');
