import { validateProfile, sanitizeString } from "./validation";

describe("validateProfile", () => {
  it("rejects empty body", () => {
    const errors = validateProfile({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.field === "name")).toBe(true);
    expect(errors.some((e) => e.field === "age")).toBe(true);
    expect(errors.some((e) => e.field === "skill_level")).toBe(true);
  });

  it("rejects age out of range", () => {
    const errors = validateProfile({ name: "Test", age: 900, skill_level: 3.0 });
    expect(errors.some((e) => e.field === "age")).toBe(true);
  });

  it("rejects negative age", () => {
    const errors = validateProfile({ name: "Test", age: -5, skill_level: 3.0 });
    expect(errors.some((e) => e.field === "age")).toBe(true);
  });

  it("rejects skill level above 5", () => {
    const errors = validateProfile({ name: "Test", age: 25, skill_level: 9000 });
    expect(errors.some((e) => e.field === "skill_level")).toBe(true);
  });

  it("rejects skill level below 1", () => {
    const errors = validateProfile({ name: "Test", age: 25, skill_level: -10 });
    expect(errors.some((e) => e.field === "skill_level")).toBe(true);
  });

  it("rejects non-array languages", () => {
    const errors = validateProfile({ name: "Test", age: 25, skill_level: 3.0, languages: "not an array" });
    expect(errors.some((e) => e.field === "languages")).toBe(true);
  });

  it("passes valid profile", () => {
    const errors = validateProfile({
      name: "Sarah",
      age: 28,
      skill_level: 3.5,
      languages: ["English", "Spanish"],
    });
    expect(errors.length).toBe(0);
  });

  it("rejects name over 100 characters", () => {
    const errors = validateProfile({ name: "A".repeat(101), age: 25, skill_level: 3.0 });
    expect(errors.some((e) => e.field === "name")).toBe(true);
  });
});

describe("sanitizeString", () => {
  it("strips HTML tags", () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("preserves normal text", () => {
    expect(sanitizeString("Hello world")).toBe("Hello world");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });
});
