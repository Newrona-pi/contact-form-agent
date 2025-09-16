import { hashPassword, verifyPassword } from "@/lib/password";

describe("Password utilities", () => {
  it("should generate a hash and salt", () => {
    const { hash, salt } = hashPassword("SuperSecure123!");
    expect(hash).toHaveLength(128);
    expect(salt).toHaveLength(32);
  });

  it("should verify a valid password", () => {
    const password = "P@ssw0rd123";
    const { hash, salt } = hashPassword(password);
    expect(verifyPassword(password, hash, salt)).toBe(true);
  });

  it("should reject an invalid password", () => {
    const password = "P@ssw0rd123";
    const { hash, salt } = hashPassword(password);
    expect(verifyPassword("wrong-password", hash, salt)).toBe(false);
  });

  it("should produce the same hash when using the same salt", () => {
    const password = "Repeatable!";
    const first = hashPassword(password);
    const second = hashPassword(password, { salt: first.salt });
    expect(first.hash).toBe(second.hash);
  });
});
