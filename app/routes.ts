import {index, route, type RouteConfig} from '@react-router/dev/routes';

export default [index('routes/home.tsx'), route('catalog', 'routes/catalog.tsx'), route('products/:productId', 'routes/product.tsx'), route('compare', 'routes/compare.tsx'), route('*', 'routes/not-found.tsx')] satisfies RouteConfig;
