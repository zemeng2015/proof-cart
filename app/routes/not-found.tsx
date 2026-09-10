import {data} from 'react-router';
import type {Route} from './+types/not-found';
import {RouteError} from '../components/route-error';

export const meta: Route.MetaFunction = () => [{title: 'Page not found — Proof Cart'}];

export function loader() {
  throw data(null, {status: 404});
}

export default function NotFound() {
  return null;
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />;
}
