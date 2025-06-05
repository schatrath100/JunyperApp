import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';

interface SectionCardsProps {
  salesKPI: {
    value: number;
    change: number;
    trendData: number[];
  };
  billsKPI: {
    value: number;
    change: number;
    trendData: number[];
  };
  newCustomersKPI: {
    value: number;
    change: number;
    trendData: number[];
  };
  cashKPI: {
    value: number;
    change: number;
    trendData: number[];
  };
  loading?: boolean;
}

export function SectionCards({ salesKPI, billsKPI, newCustomersKPI, cashKPI, loading }: SectionCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-8 w-32 mt-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-16 mt-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Sales</CardDescription>
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl tracking-tight">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(salesKPI.value)}
            </CardTitle>
            <Badge variant="outline" className={`flex items-center gap-1 text-xs ${
              salesKPI.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {salesKPI.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {salesKPI.change >= 0 ? '+' : ''}{salesKPI.change}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {salesKPI.change >= 0 ? 'Trending up' : 'Trending down'} this month
            {salesKPI.change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Total sales from invoices
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Bills</CardDescription>
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl tracking-tight">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(billsKPI.value)}
            </CardTitle>
            <Badge variant="outline" className={`flex items-center gap-1 text-xs ${
              billsKPI.change <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {billsKPI.change <= 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {billsKPI.change >= 0 ? '+' : ''}{billsKPI.change}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {billsKPI.change <= 0 ? 'Expenses decreasing' : 'Expenses increasing'}
            {billsKPI.change <= 0 ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Total expenses from bills
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl tracking-tight">
              {newCustomersKPI.value}
            </CardTitle>
            <Badge variant="outline" className={`flex items-center gap-1 text-xs ${
              newCustomersKPI.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {newCustomersKPI.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {newCustomersKPI.change >= 0 ? '+' : ''}{newCustomersKPI.change}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {newCustomersKPI.change >= 0 ? 'Growing customer base' : 'Customer acquisition down'}
            {newCustomersKPI.change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            New customers this month
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cash Balance</CardDescription>
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl tracking-tight">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(cashKPI.value)}
            </CardTitle>
            <Badge variant="outline" className={`flex items-center gap-1 text-xs ${
              cashKPI.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {cashKPI.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {cashKPI.change >= 0 ? '+' : ''}{cashKPI.change}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {cashKPI.change >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
            {cashKPI.change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Current cash position
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}