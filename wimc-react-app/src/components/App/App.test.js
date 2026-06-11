import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ModalWithForm from "../ModalWithForm/ModalWithForm";

// ─── ModalWithForm unit tests ─────────────────────────────────────────────────
// These test the form validation logic independently of Firebase.

function renderSignUpModal(onSubmit = jest.fn(), onClose = jest.fn()) {
  return render(
    <ModalWithForm
      isOpen={true}
      onClose={onClose}
      onSubmit={onSubmit}
      isSignUp={true}
      switchToLogin={jest.fn()}
      error=""
    />
  );
}

function renderLoginModal(onSubmit = jest.fn(), onClose = jest.fn()) {
  return render(
    <ModalWithForm
      isOpen={true}
      onClose={onClose}
      onSubmit={onSubmit}
      isSignUp={false}
      error=""
    />
  );
}

describe("ModalWithForm — sign up validation", () => {
  test("renders sign up form fields", () => {
    renderSignUpModal();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/re-enter/i)).toBeInTheDocument();
  });

  test("shows error when name is too short", async () => {
    renderSignUpModal();
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "A" } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 2 characters/i);
  });

  test("shows error when email is invalid", async () => {
    renderSignUpModal();
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "notanemail" } });
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
  });

  test("shows error when password is too short", async () => {
    renderSignUpModal();
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), { target: { value: "short" } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8 characters/i);
  });

  test("shows error when passwords do not match", async () => {
    renderSignUpModal();
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: "password2" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
  });

  test("shows error when terms checkbox is not checked", async () => {
    renderSignUpModal();
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: "password123" } });
    // Do NOT check the terms checkbox
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/terms of service/i);
  });

  test("calls onSubmit with form data when valid and terms accepted", async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    renderSignUpModal(onSubmit);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      username: "Jane",
      email: "jane@test.com",
      password: "password123",
    }));
  });

  test("closes on Escape key", () => {
    const onClose = jest.fn();
    renderSignUpModal(jest.fn(), onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("shows server-side error passed via props", () => {
    render(
      <ModalWithForm isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()}
        isSignUp={true} switchToLogin={jest.fn()} error="An account with this email already exists." />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i);
  });
});

describe("ModalWithForm — login validation", () => {
  test("renders login form fields", () => {
    renderLoginModal();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  test("shows error when email is empty", async () => {
    renderLoginModal();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/email is required/i);
  });
});

// ─── Footer legal links ────────────────────────────────────────────────────────
import Footer from "../Footer/Footer";

describe("Footer", () => {
  test("renders Privacy Policy and Terms of Service links", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toBeInTheDocument();
  });

  test("Privacy Policy link points to correct route", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy-policy");
  });
});
