export interface ValidationError {
  field: string;
  message: string;
}

export function validateProfile(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (body.name.length > 100) {
    errors.push({ field: "name", message: "Name must be 100 characters or fewer" });
  }

  if (body.age === undefined || body.age === null || typeof body.age !== "number") {
    errors.push({ field: "age", message: "Age is required and must be a number" });
  } else if (body.age < 13 || body.age > 120) {
    errors.push({ field: "age", message: "Age must be between 13 and 120" });
  }

  if (body.skill_level === undefined || body.skill_level === null || typeof body.skill_level !== "number") {
    errors.push({ field: "skill_level", message: "Skill level is required and must be a number" });
  } else if (body.skill_level < 1.0 || body.skill_level > 5.0) {
    errors.push({ field: "skill_level", message: "Skill level must be between 1.0 and 5.0" });
  }

  if (body.languages !== undefined && !Array.isArray(body.languages)) {
    errors.push({ field: "languages", message: "Languages must be an array of strings" });
  } else if (Array.isArray(body.languages)) {
    const invalid = body.languages.some((l: unknown) => typeof l !== "string");
    if (invalid) {
      errors.push({ field: "languages", message: "Each language must be a string" });
    }
  }

  if (body.bio !== undefined && typeof body.bio === "string" && body.bio.length > 500) {
    errors.push({ field: "bio", message: "Bio must be 500 characters or fewer" });
  }

  if (body.preferred_age_min !== undefined && typeof body.preferred_age_min === "number") {
    if (body.preferred_age_min < 13 || body.preferred_age_min > 120) {
      errors.push({ field: "preferred_age_min", message: "Preferred age min must be between 13 and 120" });
    }
  }

  if (body.preferred_age_max !== undefined && typeof body.preferred_age_max === "number") {
    if (body.preferred_age_max < 13 || body.preferred_age_max > 120) {
      errors.push({ field: "preferred_age_max", message: "Preferred age max must be between 13 and 120" });
    }
  }

  if (body.preferred_skill_min !== undefined && typeof body.preferred_skill_min === "number") {
    if (body.preferred_skill_min < 1.0 || body.preferred_skill_min > 5.0) {
      errors.push({ field: "preferred_skill_min", message: "Preferred skill min must be between 1.0 and 5.0" });
    }
  }

  if (body.preferred_skill_max !== undefined && typeof body.preferred_skill_max === "number") {
    if (body.preferred_skill_max < 1.0 || body.preferred_skill_max > 5.0) {
      errors.push({ field: "preferred_skill_max", message: "Preferred skill max must be between 1.0 and 5.0" });
    }
  }

  return errors;
}

export function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}
