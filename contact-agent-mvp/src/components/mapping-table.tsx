import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MappingHit } from '@/lib/types';

interface MappingTableProps {
  mapping: MappingHit[];
}

export function MappingTable({ mapping }: MappingTableProps) {
  const getMethodVariant = (method: string) => {
    switch (method) {
      case 'strong':
        return 'default';
      case 'autocomplete':
        return 'secondary';
      case 'candidate':
        return 'outline';
      case 'score':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">フィールドマッピング</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>フィールド</TableHead>
            <TableHead>セレクター</TableHead>
            <TableHead>方法</TableHead>
            <TableHead>信頼度</TableHead>
            <TableHead>理由</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mapping.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.key}</TableCell>
              <TableCell className="font-mono text-xs">{item.selector}</TableCell>
              <TableCell>
                <Badge variant={getMethodVariant(item.method)}>
                  {item.method}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={getConfidenceColor(item.confidence)}>
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
