import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { DatasetMeta } from '@/lib/types';
import { Search, Database, Upload, Trash2 } from 'lucide-react';

interface DatasetsMultiselectProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

export function DatasetsMultiselect({ value, onChange }: DatasetsMultiselectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: api.getDatasets,
  });

  const queryClient = useQueryClient();
  
  const uploadMutation = useMutation({
    mutationFn: api.uploadDataset,
  });
  const uploading = uploadMutation.isPending;
  const uploadDataset = (vars: any) =>
    uploadMutation.mutate(vars, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['datasets'] });
        setUploadError('');
        setUploadName('');
        setUploadTags('');
        setUploadFile(null);
      },
      onError: () => {
        setUploadError('アップロードに失敗しました');
      },
    });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/datasets?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }
      return response.json();
    },
  });
  const deleting = deleteMutation.isPending;
  const deleteDataset = (id: string) =>
    deleteMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['datasets'] });
      },
      onError: () => {
        setDeleteError('削除に失敗しました');
      },
    });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleDownloadTemplate = () => {
    try {
      const header = ['企業名', '問い合わせフォームURL', '業種'];
      const example = ['サンプル株式会社', 'https://example.com/contact', 'IT'];
      // Excel での文字化け防止のため UTF-8 BOM を付与
      const csvBody = [header.join(','), example.join(',')].join('\n');
      const csv = '\uFEFF' + csvBody;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dataset_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データセット選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データセット選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">エラーが発生しました</div>
        </CardContent>
      </Card>
    );
  }

  const datasets = data?.datasets || [];

  // 全タグを取得
  const allTags = Array.from(new Set(datasets.flatMap(d => d.tags)));

  // フィルタリング
  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => dataset.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  // 選択されたデータセットの総URL数
  const totalUrls = datasets
    .filter(d => value.includes(d.id))
    .reduce((sum, d) => sum + d.count, 0);

  const handleDatasetToggle = (datasetId: string) => {
    const newValue = value.includes(datasetId)
      ? value.filter(id => id !== datasetId)
      : [...value, datasetId];
    onChange(newValue);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          データセット選択
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* アップロード / 検索 を左右に並べる */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* アップロード（セクション） */}
          <div className="space-y-3 p-4 border rounded-md bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium tracking-wide">CSVを追加</div>
              <button
                type="button"
                className="px-2 py-1 border rounded text-xs hover:bg-muted"
                onClick={handleDownloadTemplate}
              >参考テンプレート（CSV）</button>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            {uploadFile && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="表示名（任意）"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                  />
                  <Input
                    placeholder="タグ（カンマ区切り・任意）"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    className="px-3 py-2 border rounded disabled:opacity-50"
                    disabled={!uploadFile || uploading}
                    onClick={() => {
                      if (!uploadFile) return;
                      uploadDataset({ file: uploadFile, name: uploadName || undefined, tags: uploadTags ? uploadTags.split(',').map(t => t.trim()).filter(Boolean) : [] });
                    }}
                  >{uploading ? 'アップロード中...' : 'アップロード'}</button>
                  {uploadError && <span className="text-sm text-red-500">{uploadError}</span>}
                </div>
              </>
            )}
          </div>

          {/* 検索（セクション） */}
          <div className="space-y-3 p-4 border rounded-md">
            <div className="text-sm font-medium tracking-wide">データセットを検索</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="データセットを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* タグフィルタを検索セクション内に視覚的に含める */}
            <div className="space-y-2">
              <div className="text-sm font-medium">タグで絞り込み:</div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* データセット一覧 */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredDatasets.map(dataset => {
            const isSelected = value.includes(dataset.id);
            return (
              <div
                key={dataset.id}
                className={`group p-3 border-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                  isSelected 
                    ? 'border-blue-500' 
                    : 'border-transparent hover:bg-muted/50 hover:border-gray-300'
                }`}
                onClick={() => handleDatasetToggle(dataset.id)}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleDatasetToggle(dataset.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        {dataset.name}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dataset.count}件
                    </div>
                    <div className="flex gap-1 mt-1">
                      {dataset.tags.map(tag => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDataset(dataset.id);
                      }}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* サマリ */}
        {value.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              選択中: {value.length}個のデータセット ({totalUrls}件のURL)
            </div>
            {/* 選択されたデータセットの詳細 */}
            <div className="mt-2 space-y-1">
              {datasets
                .filter(d => value.includes(d.id))
                .map(dataset => (
                  <div key={dataset.id} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{dataset.name}</span>
                    <span>({dataset.count}件)</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* エラーメッセージ */}
        {deleteError && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            {deleteError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
