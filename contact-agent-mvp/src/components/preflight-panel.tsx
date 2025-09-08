import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { PreflightRequest, PreflightResult } from '@/lib/types';
import { MappingTable } from './mapping-table';
import { Play, AlertTriangle, ExternalLink } from 'lucide-react';
import { useRunStore } from '@/store/run-store';

interface PreflightPanelProps {
  request: PreflightRequest;
  onRunStart: () => void;
}

export function PreflightPanel({ request, onRunStart }: PreflightPanelProps) {
  const clearRun = useRunStore(s => s.clearCurrentRunId);
  
  const preflightMutation = useMutation({
    mutationFn: api.preflight,
  });

  const handlePreflight = () => {
    // 過去Runのポーリングを止めてから実行
    clearRun();
    preflightMutation.mutate(request);
  };

  const results = preflightMutation.data?.results || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          事前テスト
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preflightMutation.data && (
          <div className="text-center py-8">
            <Button
              onClick={handlePreflight}
              disabled={preflightMutation.isPending}
              className="w-full"
            >
              {preflightMutation.isPending ? (
                '実行中...'
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  事前テストを実行
                </>
              )}
            </Button>
          </div>
        )}

        {preflightMutation.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              エラーが発生しました
            </div>
            <div className="text-sm text-red-600 mt-1">
              {preflightMutation.error.message}
            </div>
          </div>
        )}

        {results.map((result: PreflightResult, index: number) => (
          <div key={index} className="space-y-4 p-4 border rounded-lg">
            {/* URLと警告 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {result.url}
                </a>
              </div>
              
              {result.warnings && result.warnings.length > 0 && (
                <div className="flex gap-2">
                  {result.warnings.map((warning, warningIndex) => (
                    <Badge key={warningIndex} variant="destructive">
                      {warning}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* スクリーンショットとマッピング */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">スクリーンショット</div>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {result.screenshot ? (
                    <img
                      src={result.screenshot}
                      alt="スクリーンショット"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-muted-foreground">プレースホルダ</div>
                  )}
                </div>
              </div>
              
              <div>
                <MappingTable mapping={result.mapping} />
              </div>
            </div>
          </div>
        ))}

        {results.length > 0 && (
          <div className="pt-4 border-t">
            <Button onClick={onRunStart} className="w-full">
              実行開始
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
