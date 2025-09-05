import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProfileSchema } from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import { User, Save, X, Copy } from 'lucide-react';

interface ProfileFormProps {
  value: {
    lastName: string;
    firstName: string;
    email: string;
    phone?: string;
    department?: string;
    website?: string;
    address?: string;
    postalCode?: string;
  };
  onChange: (value: { lastName: string; firstName: string; email: string; phone?: string; department?: string; website?: string; address?: string; postalCode?: string }) => void;
}

export function ProfileForm({ value, onChange }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(ProfileSchema),
    defaultValues: value,
  });

  // フォームの値が変更されたら親コンポーネントに通知
  React.useEffect(() => {
    const subscription = watch((data) => {
      onChange(data as any);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  // ==== テンプレート保存（メッセージと同様の挙動）====
  type ProfileTemplate = { id: string; name: string; data: ProfileFormProps['value']; createdAt: number };
  const STORAGE_KEY = 'profileTemplates';
  const [templates, setTemplates] = React.useState<ProfileTemplate[]>([]);
  const [showSaveBar, setShowSaveBar] = React.useState(false);
  const [tplName, setTplName] = React.useState('');
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTemplates(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (items: ProfileTemplate[]) => {
    setTemplates(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  };

  const handleSaveTemplate = () => {
    const name = tplName.trim();
    if (!name) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const data = value;
    const next = [{ id, name, data, createdAt: Date.now() }, ...templates];
    persist(next);
    setTplName('');
    setShowSaveBar(false);
  };

  const handleApplyTemplate = (tpl: ProfileTemplate) => {
    onChange({ ...tpl.data });
  };

  const handleDeleteTemplate = (id: string) => {
    persist(templates.filter(t => t.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          送信者プロファイル
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">姓 *</label>
            <Input
              {...register('lastName')}
              placeholder="山田"
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">名 *</label>
            <Input
              {...register('firstName')}
              placeholder="太郎"
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">メールアドレス *</label>
          <Input
            {...register('email')}
            type="email"
            placeholder="example@company.com"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">電話番号</label>
          <Input
            {...register('phone')}
            placeholder="03-1234-5678"
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">部署</label>
            <Input
              {...register('department')}
              placeholder="営業部"
            />
            {errors.department && (
              <p className="text-sm text-red-500">{(errors as any).department?.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ウェブサイト</label>
            <Input
              {...register('website')}
              placeholder="https://example.com"
            />
            {errors.website && (
              <p className="text-sm text-red-500">{(errors as any).website?.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">住所</label>
            <Input
              {...register('address')}
              placeholder="東京都千代田区..."
            />
            {errors.address && (
              <p className="text-sm text-red-500">{(errors as any).address?.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">郵便番号</label>
            <Input
              {...register('postalCode')}
              placeholder="100-0001"
            />
            {errors.postalCode && (
              <p className="text-sm text-red-500">{(errors as any).postalCode?.message}</p>
            )}
          </div>
        </div>

        {/* テンプレート保存アクション */}
        {!showSaveBar && (
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 border rounded hover:bg-muted"
              onClick={() => setShowSaveBar(true)}
            >
              <Save className="h-4 w-4" /> テンプレートとして保存する
            </button>
          </div>
        )}
        {showSaveBar && (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 border rounded p-3">
            <div className="text-sm font-medium">テンプレート名</div>
            <div className="flex-1">
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="例）営業部・山田" />
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 border rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSaveTemplate}
                disabled={!tplName.trim()}
              >保存</button>
              <button
                className="px-3 py-2 border rounded hover:bg-muted"
                onClick={() => { setShowSaveBar(false); setTplName(''); }}
              ><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* 保存済みテンプレ一覧 */}
        <div className="space-y-2">
          <div className="text-sm font-medium">保存済みテンプレート</div>
          {templates.length === 0 ? (
            <div className="text-sm text-muted-foreground">まだテンプレートがありません。</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map(tpl => {
                const isActive = (
                  (value.lastName||'') === (tpl.data.lastName||'') &&
                  (value.firstName||'') === (tpl.data.firstName||'') &&
                  (value.email||'') === (tpl.data.email||'') &&
                  (value.phone||'') === (tpl.data.phone||'') &&
                  (value.department||'') === (tpl.data.department||'') &&
                  (value.website||'') === (tpl.data.website||'') &&
                  (value.address||'') === (tpl.data.address||'') &&
                  (value.postalCode||'') === (tpl.data.postalCode||'')
                );
                return (
                  <div
                    key={tpl.id}
                    className={`group p-3 border-2 rounded-lg transition-colors cursor-pointer ${
                      isActive ? 'border-blue-500' : 'border-transparent hover:bg-muted/50 hover:border-gray-300'
                    }`}
                    onClick={() => handleApplyTemplate(tpl)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{tpl.name}</div>
                          <Badge variant="secondary" className="text-xs">{new Date(tpl.createdAt).toLocaleDateString()}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                          <span>姓: {tpl.data.lastName}</span>
                          <span>名: {tpl.data.firstName}</span>
                          <span>メール: {tpl.data.email}</span>
                          {tpl.data.phone && <span>電話: {tpl.data.phone}</span>}
                          {tpl.data.department && <span>部署: {tpl.data.department}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="px-2 py-1 border rounded hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(JSON.stringify(tpl.data, null, 2)).catch(()=>{}); }}
                          title="内容をコピー"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {pendingDeleteId === tpl.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">削除しますか？</span>
                            <button
                              className="px-2 py-1 border rounded bg-red-600 text-white hover:bg-red-700"
                              onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); handleDeleteTemplate(tpl.id); }}
                            >はい</button>
                            <button
                              className="px-2 py-1 border rounded hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); }}
                            >いいえ</button>
                          </div>
                        ) : (
                          <button
                            className="px-2 py-1 border rounded hover:bg-red-50 text-red-600 border-red-200"
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(tpl.id); }}
                            title="削除"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
