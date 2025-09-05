'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DatasetsMultiselect } from '@/components/datasets-multiselect';
import { TemplateEditor } from '@/components/template-editor';
import { ProfileForm } from '@/components/profile-form';
import { RunSettingsForm } from '@/components/run-settings-form';
import { LicenseScreen } from '@/components/license-screen';
import RunMonitor from '@/components/run-monitor';
import { createRun } from '@/lib/api';
import { useRunStore } from '@/store/run-store';
import { useLicenseStore } from '@/store/license-store';
import { PreflightRequest } from '@/lib/types';
import { Play, LogOut } from 'lucide-react';

export default function Home() {
  const currentRunId = useRunStore(s => s.currentRunId);
  const setCurrentRunId = useRunStore(s => s.setCurrentRunId);
  const _hasHydrated = useRunStore(s => s._hasHydrated);
  
  // ライセンス状態
  const { isLicenseValid, setLicenseValid, clearLicense } = useLicenseStore();
  
  // フォーム状態
  const [formData, setFormData] = useState({
    datasetIds: [] as string[],
    template: {
      body: '',
    },
    profile: {
      lastName: '',
      firstName: '',
      email: '',
      phone: '' as string,
      department: '',
      website: '',
      address: '',
      postalCode: '',
    },
    config: {
      dryRun: true,
      concurrency: 3,
      timeoutSec: 12,
      showBrowser: false,
      captcha: 'none' as const
    }
  });

  // 実行開始ミューテーション
  const { mutate: startRun } = useMutation({
    mutationFn: createRun,
    onSuccess: (run) => setCurrentRunId(run.id),
  });
  
  if (!_hasHydrated) {
    return <div>Loading...</div>;
  }

  // ライセンスが有効でない場合はライセンス画面を表示
  if (!isLicenseValid) {
    return (
      <LicenseScreen 
        onLicenseValid={(key) => {
          setLicenseValid(key);
        }} 
      />
    );
  }

  const handleRunStart = () => {
    const request: PreflightRequest = {
      datasetIds: formData.datasetIds,
      template: formData.template,
      profile: formData.profile,
      config: formData.config,
      sampleCount: 1
    };
    startRun(request);
  };

  // 現在のRunがある場合はモニターを表示
  if (currentRunId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentRunId(null)}
          >
            設定に戻る
          </Button>
          <Button
            variant="outline"
            onClick={clearLicense}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            ライセンスをクリア
          </Button>
        </div>
        <RunMonitor />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">問い合わせフォーム自動入力ツール</h1>
            <p className="text-muted-foreground">
              データセットを選択し、テンプレートを設定して実行を開始します
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={clearLicense}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ライセンスをクリア
            </Button>
            <Button
              onClick={handleRunStart}
              disabled={formData.datasetIds.length === 0}
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              実行開始
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 設定エリア */}
        <div className="space-y-6">
          <Tabs defaultValue="datasets" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="datasets">データセット</TabsTrigger>
              <TabsTrigger value="message">メッセージ</TabsTrigger>
              <TabsTrigger value="profile">プロファイル</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>

            <TabsContent value="datasets" className="space-y-4">
              <DatasetsMultiselect
                value={formData.datasetIds}
                onChange={(ids) => setFormData({ ...formData, datasetIds: ids })}
              />
            </TabsContent>

            <TabsContent value="message" className="space-y-4">
              <TemplateEditor
                value={formData.template as any}
                onChange={(template) => setFormData({ ...formData, template: template as any })}
              />
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <ProfileForm
                value={formData.profile}
                onChange={(profile) => setFormData({ ...formData, profile: profile as any })}
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <RunSettingsForm
                value={formData.config}
                onChange={(config) => setFormData({ ...formData, config: config as any })}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
