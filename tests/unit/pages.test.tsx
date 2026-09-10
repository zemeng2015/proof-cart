import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import Home from '../../app/routes/home';
import {loader as notFoundLoader} from '../../app/routes/not-found';
import {RouteError} from '../../app/components/route-error';

describe('foundation page', () => {
  it('renders an honest accessible preview without shopping actions', () => {
    render(<Home />);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Good choices.Grounded in proof.');
    expect(screen.getByRole('link', {name: /Explore the catalog/})).toHaveAttribute('href', '/catalog');
    expect(screen.getByText(/Cart actions and checkout handoff are not available/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

});

describe('error routes', () => {
  it('throws a real 404 response descriptor', () => {
    expect(notFoundLoader).toThrow(expect.objectContaining({init: {status: 404}, data: null}));
  });

  it('renders a useful not-found state and a local recovery link', () => {
    render(<RouteError error={{status: 404, statusText: 'Not Found', internal: false, data: null}} />);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('This page isn’t here.');
    expect(screen.getByRole('link', {name: /Return to preview/})).toHaveAttribute('href', '/');
  });

  it.each([new Error('SECRET_EXCEPTION_DETAILS'), {status: 500, statusText: 'SECRET_STATUS', internal: false, data: 'SECRET_DATA'}, 'SECRET_UNKNOWN'])('does not disclose an arbitrary error payload', (error) => {
    const {container} = render(<RouteError error={error} />);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Something interrupted the preview.');
    expect(container.textContent).not.toContain('SECRET');
  });
});
