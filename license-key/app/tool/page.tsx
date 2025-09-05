export default async function ToolPage() {
  // 必要であればサーバー側でCookie/JWTを読み出し、プロフィール取得などを実装
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-2">ツール本体</h1>
      <p>ここは認証済みユーザーのみがアクセスできます。</p>
      <form action="/api/auth/logout" method="post">
        <button className="mt-4 border rounded px-3 py-2">ログアウト</button>
      </form>
    </main>
  );
}
