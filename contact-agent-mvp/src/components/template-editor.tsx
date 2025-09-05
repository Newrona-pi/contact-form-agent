import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Save, X, Copy } from 'lucide-react';

interface TemplateEditorProps {
  value: {
    body: string;
  };
  onChange: (value: { body: string }) => void;
}

export function TemplateEditor({ value, onChange }: TemplateEditorProps) {
  const handleBodyChange = (body: string) => {
    onChange({ ...value, body } as any);
  };

  type MsgTemplate = { id: string; name: string; body: string; createdAt: number };
  const STORAGE_KEY = 'messageTemplates';

  const [templates, setTemplates] = React.useState<MsgTemplate[]>([]);
  const [showSaveBar, setShowSaveBar] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MsgTemplate[];
        setTemplates(parsed);
      }
    } catch {}
  }, []);

  const persist = (items: MsgTemplate[]) => {
    setTemplates(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  };

  const onSaveTemplate = () => {
    const body = (value?.body || '').trim();
    const name = templateName.trim();
    if (!body || !name) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = [{ id, name, body, createdAt: Date.now() }, ...templates];
    persist(next);
    setTemplateName('');
    setShowSaveBar(false);
  };

  const onDeleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id);
    persist(next);
  };

  const onApplyTemplate = (tpl: MsgTemplate) => {
    onChange({ ...value, body: tpl.body } as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          メッセージ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* テンプレート入力 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">問い合わせ本文:</label>
          <Textarea
            value={value.body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="問い合わせの本文を入力してください。"
            className="min-h-[120px]"
          />
          {/* 保存アクションバー */}
          {(value.body?.trim()?.length ?? 0) > 0 && !showSaveBar && (
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
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="例）初回問合せ（製品資料請求）"
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 border rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  onClick={onSaveTemplate}
                  disabled={!templateName.trim() || !(value.body?.trim())}
                >保存</button>
                <button
                  className="px-3 py-2 border rounded hover:bg-muted"
                  onClick={() => { setShowSaveBar(false); setTemplateName(''); }}
                ><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>

        {/* 保存済みテンプレ一覧（データセット選択の表示仕様を踏襲） */}
        <div className="space-y-2">
          <div className="text-sm font-medium">保存済みテンプレート</div>
          {templates.length === 0 ? (
            <div className="text-sm text-muted-foreground">まだテンプレートがありません。</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  className={`group p-3 border-2 rounded-lg transition-colors cursor-pointer ${
                    (value.body || '').trim() === (tpl.body || '').trim()
                      ? 'border-blue-500'
                      : 'border-transparent hover:bg-muted/50 hover:border-gray-300'
                  }`}
                  onClick={() => onApplyTemplate(tpl)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{tpl.name}</div>
                        <Badge variant="secondary" className="text-xs">{new Date(tpl.createdAt).toLocaleDateString()}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {tpl.body}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="px-2 py-1 border rounded hover:bg-muted"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(tpl.body).catch(() => {}); }}
                        title="本文をコピー"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {pendingDeleteId === tpl.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">削除しますか？</span>
                          <button
                            className="px-2 py-1 border rounded bg-red-600 text-white hover:bg-red-700"
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); onDeleteTemplate(tpl.id); }}
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
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
