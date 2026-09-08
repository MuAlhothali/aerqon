import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("identifies the repository as a foundation without customer-data claims", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /cloud security evidence, made actionable/i })).toBeInTheDocument();
    expect(screen.getByText(/no customer data or cloud access/i)).toBeInTheDocument();
  });
});
