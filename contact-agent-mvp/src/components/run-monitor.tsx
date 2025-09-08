import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchRun, exportRunUrl } from '@/lib/api';
import { useRunStore } from '@/store/run-store';
import { formatDuration, formatDateTime } from '@/lib/format';
import { Download, Pause, Play, RefreshCw } from 'lucide-react';

export default function RunMonitor() {
  const runId     = useRunStore(s => s.currentRunId);
  const clearRun  = useRunStore(s => s.clearCurrentRunId);

  const runQuery = useQuery({
    queryKey: ["run", runId],
    // 404 対応: fetchRun は 404 の場合 null を返す前提
    queryFn: () => (runId ? fetchRun(runId) : Promise.resolve(null)),
    enabled: !!runId,
    // 走っている時だけ 1.5s 間隔でポーリング（v5: 引数は query オブジェクト）
    refetchInterval: (q) => {
      const d: any = (q as any)?.state?.data;
      return d && (d.status === "running" || d.status === "queued") ? 1500 : false;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (runQuery.data === null) {
      clearRun();
    }
  }, [runQuery.data, clearRun]);

  useEffect(() => {
    const err: any = runQuery.error;
    const msg = typeof err?.message === "string" ? err.message : "";
    if (msg.includes("404")) clearRun();
  }, [runQuery.error, clearRun]);

  const run = runQuery.data;

  const handleExport = () => {
    if (!runId) return;
    const url = exportRunUrl(runId);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result-${runId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!runId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>実行モニター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            実行が開始されていません
          </div>
        </CardContent>
      </Card>
    );
  }

  if (runQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>実行モニター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  if (runQuery.error || !run) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>実行モニター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            エラーが発生しました
          </div>
        </CardContent>
      </Card>
    );
  }

  // tasks のステータスから再計算（"success"/"ok" を成功、"failed"/"ng" を失敗としてカウント）
  const successCount = Array.isArray(run.tasks)
    ? run.tasks.filter((t: any) => t.status === "success" || t.status === "ok").length
    : run.success;
  const failCount = Array.isArray(run.tasks)
    ? run.tasks.filter((t: any) => t.status === "failed" || t.status === "ng").length
    : run.failed;
  const runningCount = Math.max(0, (run.total ?? successCount + failCount) - successCount - failCount);
  const progress = run.total > 0 ? ((successCount + failCount) / run.total) * 100 : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline">待機中</Badge>;
      case 'running':
        return <Badge variant="secondary">実行中</Badge>;
      case 'paused':
        return <Badge variant="outline">一時停止</Badge>;
      case 'done':
        return <Badge variant="default">完了</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline">待機中</Badge>;
      case 'running':
        return <Badge variant="secondary">実行中</Badge>;
      case 'success':
        return <Badge variant="default">成功</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      case 'skipped':
        return <Badge variant="outline">スキップ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>実行モニター</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => runQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              {run.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              エクスポート
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 実行状況 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">実行状況:</span>
              {getStatusBadge(run.status)}
            </div>
            <div className="text-sm text-muted-foreground">
              {run.startedAt && `開始: ${formatDateTime(run.startedAt)}`}
            </div>
          </div>

          <Progress value={progress} className="w-full" />
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{run.total}</div>
              <div className="text-sm text-muted-foreground">総数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-muted-foreground">成功</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-sm text-muted-foreground">失敗</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{runningCount}</div>
              <div className="text-sm text-muted-foreground">実行中</div>
            </div>
          </div>
        </div>

        {/* タスク一覧 */}
        <div className="space-y-2">
          <div className="text-sm font-medium">タスク一覧</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>時間</TableHead>
                <TableHead>エラー</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.tasks.map((task, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                    {task.url}
                  </TableCell>
                  <TableCell>
                    {getTaskStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    {task.durationMs ? formatDuration(task.durationMs) : '-'}
                  </TableCell>
                  {/* DRY-RUN の注意文言はグレー表示に */}
                  <TableCell className={(task.error?.toLowerCase?.().includes("dry-run") ? "text-gray-500" : "text-red-600") + " text-sm max-w-[200px] truncate"}>
                    {task.error || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {run.lastError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-600 mb-1">最後のエラー:</div>
            <div className="text-sm text-red-600">{run.lastError}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
