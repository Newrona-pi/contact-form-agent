import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Shield, Clock, Monitor } from 'lucide-react';

interface RunSettingsFormProps {
  value: {
    dryRun: boolean;
    concurrency: number;
    timeoutSec: number;
    showBrowser: boolean;
    captcha: "none" | "twocaptcha" | "anticaptcha" | "capsolver";
  };
  onChange: (value: {
    dryRun: boolean;
    concurrency: number;
    timeoutSec: number;
    showBrowser: boolean;
    captcha: "none" | "twocaptcha" | "anticaptcha" | "capsolver";
  }) => void;
}

export function RunSettingsForm({ value, onChange }: RunSettingsFormProps) {
  const handleChange = (key: string, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          実行設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 安全設定 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4" />
            安全設定
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">ドライラン</div>
              <div className="text-xs text-muted-foreground">
                実際の送信は行わず、テストのみ実行
              </div>
            </div>
            <Switch
              checked={value.dryRun}
              onCheckedChange={(checked) => handleChange('dryRun', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">ブラウザ表示</div>
              <div className="text-xs text-muted-foreground">
                実行中のブラウザを表示（デバッグ用）
              </div>
            </div>
            <Switch
              checked={value.showBrowser}
              onCheckedChange={(checked) => handleChange('showBrowser', checked)}
            />
          </div>
        </div>

        {/* パフォーマンス設定 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            パフォーマンス設定
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">並列数 (1-8)</label>
            <Input
              type="number"
              min="1"
              max="8"
              value={value.concurrency}
              onChange={(e) => handleChange('concurrency', parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">タイムアウト (5-60秒)</label>
            <Input
              type="number"
              min="5"
              max="60"
              value={value.timeoutSec}
              onChange={(e) => handleChange('timeoutSec', parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* CAPTCHA設定 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4" />
            CAPTCHA設定
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">CAPTCHA解決サービス</label>
            <Select
              value={value.captcha}
              onValueChange={(value) => handleChange('captcha', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                <SelectItem value="twocaptcha">2captcha</SelectItem>
                <SelectItem value="anticaptcha">Anti-Captcha</SelectItem>
                <SelectItem value="capsolver">CapSolver</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 安全ガード */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">安全ガード</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• 検索フォームは自動で除外されます</div>
            <div>• 購読フォームは自動で除外されます</div>
            <div>• クーポン・割引フォームは自動で除外されます</div>
            <div>• ハニーポットフィールドは自動で除外されます</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
