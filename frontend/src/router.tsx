import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Pokedex } from "./pages/Pokedex";
import { TeamBuilder } from "./pages/TeamBuilder";
import { MyTeams } from "./pages/MyTeams";
import { TopTeams } from "./pages/TopTeams";
import { DamageCalc } from "./pages/DamageCalc";
import { Settings } from "./pages/Settings";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "pokedex", element: <Pokedex /> },
      { path: "team-builder", element: <TeamBuilder /> },
      { path: "team-builder/:id", element: <TeamBuilder /> },
      { path: "my-teams", element: <MyTeams /> },
      { path: "top-teams", element: <TopTeams /> },
      { path: "damage-calc", element: <DamageCalc /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
