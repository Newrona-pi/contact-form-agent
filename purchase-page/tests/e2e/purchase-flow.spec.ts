import { test, expect } from "@playwright/test";

test.describe("Purchase Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/purchase");
  });

  test("should complete credit card purchase flow", async ({ page }) => {
    // ステップ1: 会社情報
    await page.fill('[data-testid="company_name"]', "株式会社テスト");
    await page.fill('[data-testid="company_kana"]', "カブシキガイシャテスト");
    await page.fill('[data-testid="department"]', "営業部");
    await page.fill('[data-testid="role"]', "部長");
    await page.click('[data-testid="next-button"]');

    // ステップ2: 担当者情報
    await page.fill('[data-testid="contact_name"]', "田中太郎");
    await page.fill('[data-testid="contact_kana"]', "タナカタロウ");
    await page.fill('[data-testid="email"]', "tanaka@example.com");
    await page.fill('[data-testid="phone"]', "03-1234-5678");
    await page.click('[data-testid="next-button"]');

    // ステップ3: 請求関連
    await page.fill('[data-testid="billing_name"]', "株式会社テスト");
    await page.selectOption('[data-testid="payment_method"]', "credit");
    await page.click('[data-testid="next-button"]');

    // ステップ4: 契約・利用
    await page.selectOption('[data-testid="plan"]', "one_time");
    await page.fill('[data-testid="seats"]', "5");
    await page.fill('[data-testid="use_case"]', "お客様のフォーム入力業務の自動化");
    await page.click('[data-testid="next-button"]');

    // ステップ5: その他
    await page.fill('[data-testid="referral_code"]', "FRIEND2024");
    await page.fill('[data-testid="notes"]', "テスト用の注文です");
    await page.check('[data-testid="agree_tos"]');
    await page.click('[data-testid="submit-button"]');

    // 確認ページ
    await expect(page).toHaveURL(/\/purchase\/confirm/);
    await expect(page.locator("text=購入が完了しました")).toBeVisible();
    await expect(page.locator("text=注文内容の確認")).toBeVisible();
    await expect(page.locator("text=株式会社テスト")).toBeVisible();
    await expect(page.locator("text=田中太郎")).toBeVisible();
    await expect(page.locator("text=買い切り")).toBeVisible();
    await expect(page.locator("text=5席")).toBeVisible();

    // 決済に進む
    await page.click('[data-testid="proceed-button"]');

    // サンクスページ（クレジットカード決済）
    await expect(page).toHaveURL(/\/purchase\/thanks/);
    await expect(page.locator("text=お申し込みありがとうございます")).toBeVisible();
    await expect(page.locator("text=クレジットカード決済")).toBeVisible();
  });

  test("should complete invoice payment flow", async ({ page }) => {
    // ステップ1: 会社情報
    await page.fill('[data-testid="company_name"]', "株式会社請求書テスト");
    await page.click('[data-testid="next-button"]');

    // ステップ2: 担当者情報
    await page.fill('[data-testid="contact_name"]', "請求書太郎");
    await page.fill('[data-testid="email"]', "invoice@example.com");
    await page.click('[data-testid="next-button"]');

    // ステップ3: 請求関連
    await page.fill('[data-testid="billing_name"]', "株式会社請求書テスト");
    await page.selectOption('[data-testid="payment_method"]', "invoice");
    await page.click('[data-testid="next-button"]');

    // ステップ4: 契約・利用
    await page.selectOption('[data-testid="plan"]', "monthly");
    await page.fill('[data-testid="seats"]', "3");
    await page.click('[data-testid="next-button"]');

    // ステップ5: その他
    await page.check('[data-testid="agree_tos"]');
    await page.click('[data-testid="submit-button"]');

    // 確認ページ
    await expect(page).toHaveURL(/\/purchase\/confirm/);
    await expect(page.locator("text=購入が完了しました")).toBeVisible();
    await expect(page.locator("text=請求書払い")).toBeVisible();

    // 見積書を生成
    await page.click('[data-testid="proceed-button"]');

    // サンクスページ（請求書払い）
    await expect(page).toHaveURL(/\/purchase\/thanks/);
    await expect(page.locator("text=お申し込みありがとうございます")).toBeVisible();
    await expect(page.locator("text=請求書払い")).toBeVisible();
    await expect(page.locator("text=見積書・請求書を送付いたします")).toBeVisible();
  });

  test("should show validation errors", async ({ page }) => {
    // 空のフォームで送信を試行
    await page.click('[data-testid="next-button"]');
    
    // 会社名のエラーが表示される
    await expect(page.locator("text=会社名を入力してください")).toBeVisible();
  });

  test("should show free email warning", async ({ page }) => {
    await page.fill('[data-testid="company_name"]', "株式会社テスト");
    await page.click('[data-testid="next-button"]');

    await page.fill('[data-testid="contact_name"]', "田中太郎");
    await page.fill('[data-testid="email"]', "test@gmail.com");
    
    // フリーメール警告が表示される
    await expect(page.locator("text=フリーメールアドレスが検出されました")).toBeVisible();
  });

  test("should allow editing from confirm page", async ({ page }) => {
    // フォームを入力
    await page.fill('[data-testid="company_name"]', "株式会社テスト");
    await page.click('[data-testid="next-button"]');
    await page.fill('[data-testid="contact_name"]', "田中太郎");
    await page.fill('[data-testid="email"]', "tanaka@example.com");
    await page.click('[data-testid="next-button"]');
    await page.fill('[data-testid="billing_name"]', "株式会社テスト");
    await page.selectOption('[data-testid="payment_method"]', "credit");
    await page.click('[data-testid="next-button"]');
    await page.selectOption('[data-testid="plan"]', "one_time");
    await page.fill('[data-testid="seats"]', "1");
    await page.click('[data-testid="next-button"]');
    await page.check('[data-testid="agree_tos"]');
    await page.click('[data-testid="submit-button"]');

    // 確認ページで編集
    await page.click('[data-testid="edit-button"]');
    
    // フォームページに戻る
    await expect(page).toHaveURL(/\/purchase/);
  });
});
