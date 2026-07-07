import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the sign-in check while auth status is pending', () => {
  render(<App />);
  const status = screen.getByText(/checking sign-in status/i);
  expect(status).toBeInTheDocument();
});
