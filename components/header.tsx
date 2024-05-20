import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-2xl font-bold px-4">Audio Cutter</h1>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
}
