import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import * as useLoginFormModule from '@/hooks/useLoginForm';

// Mock the useLoginForm hook
vi.mock('@/hooks/useLoginForm');

describe('LoginForm', () => {
  const mockHandleEmailChange = vi.fn();
  const mockHandlePasswordChange = vi.fn();
  const mockTogglePasswordVisibility = vi.fn();
  const mockHandleSubmit = vi.fn((e) => e.preventDefault());

  const defaultMockReturn = {
    formData: { email: '', password: '' },
    errors: {},
    isSubmitting: false,
    apiError: null,
    showPassword: false,
    handleEmailChange: mockHandleEmailChange,
    handlePasswordChange: mockHandlePasswordChange,
    togglePasswordVisibility: mockTogglePasswordVisibility,
    handleSubmit: mockHandleSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue(defaultMockReturn);
  });

  describe('rendering', () => {
    it('renders the login form with all fields', () => {
      render(<LoginForm />);

      expect(screen.getByRole('heading', { name: /log in to 10xcards/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
    });

    it('renders email input with correct attributes', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('renders password input with correct attributes', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('renders password visibility toggle button', () => {
      render(<LoginForm />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('type', 'button');
    });

    it('renders link to registration page', () => {
      render(<LoginForm />);

      const registerLink = screen.getByRole('link', { name: /create an account/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  describe('user interactions', () => {
    it('calls handleEmailChange when email input changes', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(mockHandleEmailChange).toHaveBeenCalled();
    });

    it('calls handlePasswordChange when password input changes', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      expect(mockHandlePasswordChange).toHaveBeenCalled();
    });

    it('calls togglePasswordVisibility when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleButton);

      expect(mockTogglePasswordVisibility).toHaveBeenCalledOnce();
    });

    it('calls handleSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /^log in$/i });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledOnce();
    });

    it('displays password as text when showPassword is true', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        showPassword: true,
      });

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('changes toggle button label when password is visible', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        showPassword: true,
      });

      render(<LoginForm />);

      const toggleButton = screen.getByRole('button', { name: /hide password/i });
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('validation errors', () => {
    it('displays email validation error', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        errors: { email: 'Please enter a valid email address' },
      });

      render(<LoginForm />);

      const errorMessage = screen.getByText(/please enter a valid email address/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('id', 'email-error');
    });

    it('displays password validation error', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        errors: { password: 'Password is required' },
      });

      render(<LoginForm />);

      const errorMessage = screen.getByText(/password is required/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('id', 'password-error');
    });

    it('adds error styling to email input when error exists', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        errors: { email: 'Email is required' },
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveClass('border-red-500');
    });

    it('adds error styling to password input when error exists', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        errors: { password: 'Password is required' },
      });

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveClass('border-red-500');
    });

    it('sets aria-invalid on email input when error exists', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        errors: { email: 'Email is required' },
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('sets aria-invalid on password input when error exists', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        errors: { password: 'Password is required' },
      });

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
    });
  });

  describe('api errors', () => {
    it('displays api error message', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        apiError: 'Invalid username or password',
      });

      render(<LoginForm />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent(/invalid username or password/i);
    });

    it('api error has correct ARIA attributes', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        apiError: 'Network error',
      });

      render(<LoginForm />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'polite');
    });

    it('does not display api error when none exists', () => {
      render(<LoginForm />);

      const errorAlert = screen.queryByRole('alert');
      expect(errorAlert).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('displays loading text when submitting', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        isSubmitting: true,
      });

      render(<LoginForm />);

      expect(screen.getByText(/logging in\.\.\./i)).toBeInTheDocument();
    });

    it('disables submit button when submitting', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        isSubmitting: true,
      });

      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /logging in\.\.\./i });
      expect(submitButton).toBeDisabled();
    });

    it('disables email input when submitting', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        isSubmitting: true,
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeDisabled();
    });

    it('disables password input when submitting', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        isSubmitting: true,
      });

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toBeDisabled();
    });

    it('displays loading spinner icon when submitting', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        isSubmitting: true,
      });

      render(<LoginForm />);

      const spinner = screen.getByRole('button', { name: /logging in\.\.\./i }).querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('form values', () => {
    it('displays email value from formData', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        formData: { email: 'test@example.com', password: '' },
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('displays password value from formData', () => {
      vi.mocked(useLoginFormModule.useLoginForm).mockReturnValue({
        ...defaultMockReturn,
        formData: { email: '', password: 'mypassword' },
      });

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      expect(passwordInput.value).toBe('mypassword');
    });
  });

  describe('accessibility', () => {
    it('has proper form structure with labels', () => {
      render(<LoginForm />);

      const emailLabel = screen.getByText(/^email$/i);
      const passwordLabel = screen.getByText(/^password$/i);

      expect(emailLabel).toHaveAttribute('for', 'email');
      expect(passwordLabel).toHaveAttribute('for', 'password');
    });

    it('password toggle button has tabIndex -1 to skip in tab order', () => {
      render(<LoginForm />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toHaveAttribute('tabindex', '-1');
    });

    it('maintains focus management for password input', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('tabindex', '-1');
    });
  });
});
