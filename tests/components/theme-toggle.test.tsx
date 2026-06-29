import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });

  it("toggles the html dark class and stores the selected theme", async () => {
    render(<ThemeToggle />);

    const button = await screen.findByRole("button", {
      name: "Switch to dark mode",
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(button).toHaveAccessibleName("Switch to light mode");
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass("dark");
      expect(localStorage.getItem("theme")).toBe("light");
      expect(button).toHaveAccessibleName("Switch to dark mode");
    });
  });
});
