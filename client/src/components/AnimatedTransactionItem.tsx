import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useCurrencyFormatter } from "@/hooks/useProfile";
import type { TransactionWithSplits } from "@shared/schema";
import React from "react";

interface AnimatedTransactionItemProps {
  transaction: TransactionWithSplits;
  index: number;
}

export default function AnimatedTransactionItem({ 
  transaction, 
  index 
}: AnimatedTransactionItemProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const [isHovered, setIsHovered] = useState(false);

  const getTransactionIcon = (category: string, type: string) => {
    if (type === 'income') return '💰';
    
    switch (category) {
      case 'food': return '🍽️';
      case 'utilities': return '⚡';
      case 'entertainment': return '🎬';
      case 'transportation': return '🚗';
      case 'shopping': return '🛍️';
      case 'healthcare': return '🏥';
      case 'education': return '📚';
      case 'salary': return '💼';
      case 'freelance': return '💻';
      case 'business': return '🏢';
      case 'investment': return '📈';
      case 'rental': return '🏠';
      default: return '📋';
    }
  };

  const animationDelay = `${900 + (index * 100)}ms`;

  return (
    <Card 
      className={`
        p-4 card-hover animate-fade-in animate-stagger cursor-pointer
        ${isHovered ? 'ring-2 ring-blue-200 shadow-lg' : ''}
        ${transaction.type === 'income' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}
      `}
      style={{ 
        animationDelay 
      } as React.CSSProperties}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`transaction-item-${transaction.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg
            transition-all duration-300 ${isHovered ? 'scale-110' : 'scale-100'}
            ${transaction.type === 'income' 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
            }
          `}>
            {getTransactionIcon(transaction.category, transaction.type)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className={`
                font-medium text-gray-900 transition-all duration-200
                ${isHovered ? 'text-lg' : 'text-base'}
              `}>
                {transaction.description}
              </h3>
              {transaction.isShared && (
                <Badge 
                  variant="secondary" 
                  className="animate-pulse-custom bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  Shared
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-gray-500">
                {transaction.paidBy || 'Unknown'}
              </p>
              <span className="text-gray-300">•</span>
              <p className="text-sm text-gray-500">
                {format(new Date(transaction.date || Date.now()), 'MMM dd, yyyy')}
              </p>
              {transaction.category !== 'other' && (
                <>
                  <span className="text-gray-300">•</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {transaction.category}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`
            font-bold text-lg transition-all duration-300
            ${isHovered ? 'scale-110' : 'scale-100'}
            ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}
          `}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </div>
          
          {transaction.splits && transaction.splits.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Split among {transaction.splits.length + 1}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}