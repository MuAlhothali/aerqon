import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("identifies the repository as a foundation without customer-data claims", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Assessment", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
    expect(screen.getByText(/no customer data or cloud access/i)).toBeInTheDocument();
  });
});
