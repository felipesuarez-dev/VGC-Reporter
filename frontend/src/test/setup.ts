import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// The components under test call t() for labels. Rendering the real i18n stack
// would test i18next rather than the component, so the key is echoed back with
// its interpolations, which also makes a missing key obvious in an assertion.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params && Object.keys(params).length > 0
        ? `${key}(${Object.entries(params)
            .map(([k, v]) => `${k}=${v}`)
            .join(",")})`
        : key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));
