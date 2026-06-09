import { AppProviders } from "@/app/providers/AppProviders";
import { MainMenuPage } from "@/pages/MainMenuPage";

export function App() {
  return (
    <AppProviders>
      <MainMenuPage />
    </AppProviders>
  );
}
